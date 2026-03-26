console.log("--- Ingest Function Module Loading ---");
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createOpenAI } from "https://esm.sh/@ai-sdk/openai@0.0.66";
import { embed, generateText } from "https://esm.sh/ai@3.4.33";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: Deno.env.get("OPENROUTER_API_KEY"),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("--- Ingest Function Module Loaded, calling serve() ---");

serve(async (req) => {
  console.log(`--- Request Received: ${req.method} ${req.url} ---`);
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight...");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- Processing Request ---");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Auth Check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Error: Missing Authorization header");
      return new Response("Missing Authorization header", { status: 401, headers: corsHeaders });
    }

    console.log("Authenticating user...");
    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    console.log(`User authenticated: ${user.id}`);

    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));
    const { filePaths, agentId, kbId: providedKbId } = body;

    if (!filePaths || !Array.isArray(filePaths) || (!agentId && !providedKbId)) {
      console.error("Error: Invalid input parameters");
      return new Response("Invalid input", { status: 400, headers: corsHeaders });
    }

    let kbId = providedKbId;

    if (!kbId) {
        console.log(`No kbId provided, resolving for agentId: ${agentId}`);
        // Find or Create Project/KB based on agentId
        // 1. Find/Create Project
        let { data: project } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', 'Default Project')
            .maybeSingle();
        
        if (!project) {
            console.log("Creating default project...");
            const { data: newProject, error: projError } = await supabaseAdmin
                .from('projects')
                .insert({ user_id: user.id, name: 'Default Project' })
                .select()
                .single();
            if (projError) {
                console.error("Project creation error:", projError);
                throw projError;
            }
            project = newProject;
        }
        console.log(`Project resolved: ${project.id}`);

        // 2. Find/Create KB
        let { data: kb } = await supabaseAdmin
            .from('user_kbs')
            .select('id')
            .eq('user_id', user.id)
            .eq('project_id', project.id)
            .eq('name', `Agent ${agentId} Uploads`)
            .maybeSingle();

        if (!kb) {
            console.log(`Creating KB for agent ${agentId}...`);
            const { data: newKb, error: kbError } = await supabaseAdmin
                .from('user_kbs')
                .insert({ user_id: user.id, project_id: project.id, name: `Agent ${agentId} Uploads` })
                .select()
                .single();
            if (kbError) {
                console.error("KB creation error:", kbError);
                throw kbError;
            }
            kb = newKb;
        }
        kbId = kb.id;
    }
    
    console.log(`Knowledge Base ID resolved: ${kbId}`);

    // 2. Process Files
    console.log(`Processing ${filePaths.length} files...`);
    for (const path of filePaths) {
      console.log(`Downloading file: ${path}`);
      // Download file
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from("kb_attachments") 
        .download(path);

      if (downloadError || !fileData) {
        console.error(`Failed to download ${path}:`, downloadError);
        continue;
      }

      const fileName = path.split("/").pop() || "";
      const ext = fileName.split('.').pop()?.toLowerCase();
      const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '');

      let text = "";

      if (isImage) {
        console.log(`Image detected (${fileName}). Generating description...`);
        const uint8Array = new Uint8Array(await fileData.arrayBuffer());
        let mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        try {
          const { text: imageDescription } = await generateText({
            model: openrouter("anthropic/claude-3.5-sonnet"),
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "Describe this image in detail so that a text-based AI can understand everything about it. Include any text, objects, people, colors, and the overall scene." },
                  { type: "image", image: uint8Array, mimeType: mimeType }
                ]
              }
            ]
          });
          text = `[Image Description of ${fileName}]:\n${imageDescription}`;
          console.log(`Generated description: ${text.substring(0, 100)}...`);
        } catch (imgErr) {
          console.error("Failed to generate image description:", imgErr);
          continue; // Skip this file if we can't describe it
        }
      } else {
        console.log(`File downloaded successfully. Extracting text...`);
        text = await fileData.text(); 
        console.log(`Extracted ${text.length} characters.`);
      }

      // Create Attachment Record
      console.log(`Creating attachment record for ${path}...`);
      const { data: attachment, error: attachError } = await supabaseAdmin
        .from("kb_attachments")
        .insert({
            kb_id: kbId,
            file_path: path,
            file_name: fileName
        })
        .select()
        .single();
        
      if (attachError) {
          console.error("Failed to create attachment record:", attachError);
          continue;
      }
      console.log(`Attachment record created: ${attachment.id}`);

      // Chunking (Simple overlap)
      const chunkSize = 1000;
      const overlap = 200;
      const chunks = [];
      
      for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      console.log(`Split text into ${chunks.length} chunks.`);

      // Generate Embeddings & Insert
      console.log(`Generating embeddings and inserting into database...`);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const { embedding } = await embed({
            model: openrouter.embedding("text-embedding-3-small"),
            value: chunk,
        });

        const { error: insertError } = await supabaseAdmin.from("kb_embeddings").insert({
            kb_id: kbId,
            attachment_id: attachment.id,
            content: chunk,
            embedding: embedding
        });

        if (insertError) {
            console.error(`Error inserting chunk ${i}:`, insertError);
        }
      }
      console.log(`Finished processing file: ${path}`);
    }

    console.log("--- Ingest Function Completed Successfully ---");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("--- Ingest Function Error ---");
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
