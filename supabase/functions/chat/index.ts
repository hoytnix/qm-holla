import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createOpenAI } from "https://esm.sh/@ai-sdk/openai@0.0.30";
import { streamObject, embed } from "https://esm.sh/ai@3.4.33";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Read body first to extract token if it's in the body
    const body = await req.json();
    const { agentId, inputs, model } = body;
    
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || inputs?.token;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization token" }), { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // 1. Auth Check
    const {
      data: { user },
      error: authError
    } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth check failed:', { authError, user });
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError }), { status: 401, headers: corsHeaders });
    }
    
    // Create a client with the user's token for RLS-compliant operations
    const userSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const userQuery = inputs?.user_query || "";
    const projectId = inputs?.project_id;
    const customInstructions = inputs?.custom_instructions || "";
    const conversationId = inputs?.conversation_id;

    let instructions = customInstructions;
    if (conversationId) {
      const { count } = await userSupabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      
      if (count && count > 0) {
        instructions = "";
      }
    }

    if (!agentId) {
      return new Response(JSON.stringify({ error: "Missing agentId" }), { status: 400, headers: corsHeaders });
    }

    // Initialize OpenRouter
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: Deno.env.get("OPENROUTER_API_KEY") ?? "",
    });

    // 1.5. RAG - Fetch Context if KBs are enabled
    let kbContext = "";
    const { data: agentData } = await userSupabaseClient
      .from('agents')
      .select('branding_config')
      .eq('id', agentId)
      .single();

    let kbIds = agentData?.branding_config?.kb_ids || (agentData?.branding_config?.kb_id ? [agentData.branding_config.kb_id] : []);

    // Fetch Project KBs
    if (projectId) {
      const { data: projectKbs } = await userSupabaseClient
        .from('user_kbs')
        .select('id')
        .eq('project_id', projectId);
      
      if (projectKbs) {
        const projectKbIds = projectKbs.map((kb: any) => kb.id);
        kbIds = [...kbIds, ...projectKbIds];
      }
    }

    if (kbIds.length > 0) {
      console.log(`Performing RAG across ${kbIds.length} KBs...`);
      try {
        // Generate embedding for query
        // Note: OpenRouter doesn't support embeddings. Using OpenAI if available, or fallback.
        // We will try to use the OpenAI provider if OPENAI_API_KEY is set, otherwise this will fail.
        const openai = createOpenAI({
          apiKey: Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OPENROUTER_API_KEY") ?? "",
        });
        
        const { embedding } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: userQuery,
        });

        // Search across multiple KBs
        const { data: matches, error: matchError } = await userSupabaseClient.rpc('match_kb_embeddings_multi', {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: 5,
          p_kb_ids: kbIds
        });

        if (matchError) {
          console.error('RAG match error:', matchError);
        } else if (matches && matches.length > 0) {
          kbContext = matches.map((m: any) => m.content).join("\n\n---\n\n");
          console.log(`Found ${matches.length} matches for context.`);
        }
      } catch (e) {
        console.error("Embedding generation failed. OpenRouter does not support embeddings. Please set OPENAI_API_KEY.", e);
      }
    }

    const modelName = model || "anthropic/claude-3.5-sonnet";

    // Initialize an admin client to bypass RLS for fetching model prices
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1.7. Credit Check & Decrement
    const { data: modelData, error: modelError } = await adminSupabaseClient
      .from('model_prices')
      .select('fixed_cost')
      .eq('model_string', modelName)
      .single();
    
    const cost = modelData?.fixed_cost || 0;

    const { data: success, error: rpcError } = await userSupabaseClient
      .rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: cost,
        p_description: `Chat with model ${modelName}`
      });
    
    console.log('Credit deduction result:', { success, rpcError });

    if (rpcError || !success) {
        return new Response(JSON.stringify({ 
          error: "Insufficient credits or error deducting",
          details: rpcError || "Function returned false"
        }), { status: 402, headers: corsHeaders });
    }

    // 2. Generate Response
    const result = await streamObject({
      model: openrouter(modelName),
      schema: z.object({
        thoughts: z.array(z.string()).describe("Internal reasoning process."),
        message: z.string().describe("The response to the user."),
        suggested_actions: z.array(z.string()).describe("Follow-up actions, if any."),
      }),
      prompt: `${instructions}
      
      ## Context from Knowledge Base:
      ${kbContext || "No relevant information found in knowledge base."}
      
      ## Additional Context: ${JSON.stringify(inputs)}
      
      ## Prompt
      
      ${userQuery}`,
    });

    return result.toTextStreamResponse({
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
