import React, { useState, useRef, useEffect } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from './MarkdownRenderer';
import { db, Message } from '../lib/db';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Paperclip, Send, Sparkles, ChevronDown, Bot, Zap, BrainCircuit } from 'lucide-react';
import { Person } from '@mui/icons-material';
import md5 from 'md5';

// Define the schema for the structured response
const responseSchema = z.object({
  thoughts: z.array(z.string()),
  message: z.string(),
  suggested_actions: z.array(z.string()),
});

interface ChatInterfaceProps {
  agentId: string;
  conversationId: string;
  contextData: Record<string, any>; // From DynamicForm
  allowedModels?: string[];
  defaultModel?: string;
  currentProject?: any;
  agentSystemPrompt?: string;
  onCreditUpdate?: () => void;
}

export function ChatInterface({ agentId, conversationId, contextData, allowedModels, defaultModel, currentProject, agentSystemPrompt, onCreditUpdate }: ChatInterfaceProps) {
  const { session } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [agentData, setAgentData] = useState<any>(null);

  useEffect(() => {
    async function fetchAgent() {
      const { data } = await supabase.from('agents').select('name, branding_config').eq('id', agentId).single();
      if (data) {
        setAgentData(data);
      }
    }
    fetchAgent();
  }, [agentId]);

  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const initializedRef = useRef(false);

  // Fetch all models from DB to get display names and IDs
  useEffect(() => {
    async function fetchModels() {
      const { data } = await supabase.from('model_prices').select('*');
      if (data) {
        setAvailableModels(data);
      }
    }
    fetchModels();
  }, []);

  // Filter available models based on allowedModels from agent
  const validModels = availableModels.filter(m => 
    allowedModels?.includes(m.model_string)
  );

  // Ensure selected model is valid
  useEffect(() => {
    if (validModels.length > 0) {
      if (!selectedModel || !validModels.find(m => m.model_string === selectedModel)) {
        // Use defaultModel if it's valid, otherwise fallback to the first valid model
        if (defaultModel && validModels.find(m => m.model_string === defaultModel)) {
          setSelectedModel(defaultModel);
        } else {
          setSelectedModel(validModels[0].model_string);
        }
      }
    }
  }, [validModels, selectedModel, defaultModel]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const { object, submit, isLoading, error } = useObject({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
    fetch: async (input, init) => {
      const token = session?.access_token;
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
      return fetch(input, { ...init, headers });
    },
    schema: responseSchema,
    onFinish: async ({ object }) => {
      if (object) {
        // Save assistant message to Dexie
        const assistantMsg: Message = {
          role: 'assistant',
          content: object.message || '',
          thoughts: object.thoughts,
          suggested_actions: object.suggested_actions,
          created_at: new Date(),
          agent_id: agentId,
          conversation_id: conversationId,
        };
        await db.messages.add(assistantMsg);
        setMessages((prev) => [...prev, assistantMsg]);
        
        // Trigger credit update
        if (onCreditUpdate) {
            onCreditUpdate();
        }
      }
    },
    onError: (err) => {
      console.error('Chat error:', err);
    }
  });

  // Auto-initiate chat if contextData is provided
  useEffect(() => {
    if (contextData && Object.keys(contextData).length > 0 && !initializedRef.current && selectedModel && messages.length === 0) {
      initializedRef.current = true;
      
      // Perform template substitution on custom_instructions
      let baseInstructions = [agentSystemPrompt, currentProject?.custom_instructions].filter(Boolean).join('\n\n');
      let processedInstructions = baseInstructions + '\n\nDo not send any greeting. Respond only to the prompt provided.';
      Object.entries(contextData).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          processedInstructions = processedInstructions.replace(regex, String(value));
      });

      submit({
        agentId,
        model: selectedModel,
        inputs: {
          ...contextData,
          user_query: processedInstructions,
          project_id: currentProject?.id,
          custom_instructions: processedInstructions,
          messages: [],
          token: session?.access_token
        }
      });
    }
  }, [contextData, selectedModel, submit, agentId, currentProject, session, messages.length]);

  // Load history from Dexie
  useEffect(() => {
    if (agentId && conversationId) {
      db.messages
        .where('conversation_id')
        .equals(conversationId)
        .sortBy('created_at')
        .then((msgs) => setMessages(msgs));
    }
  }, [agentId, conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, object]);

  const gravatarUrl = session?.user?.email 
    ? `https://www.gravatar.com/avatar/${md5(session.user.email.trim().toLowerCase())}?d=mp`
    : '';

  const handleSendMessage = async (content: string) => {
    if (!content.trim() && !isLoading) return;

    // Save user message to Dexie
    const userMsg: Message = {
      role: 'user',
      content,
      created_at: new Date(),
      agent_id: agentId,
      conversation_id: conversationId,
    };
    await db.messages.add(userMsg);
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    // Trigger AI generation
    let baseInstructions = [agentSystemPrompt, currentProject?.custom_instructions].filter(Boolean).join('\n\n');
    let processedInstructions = baseInstructions;
    Object.entries(contextData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedInstructions = processedInstructions.replace(regex, String(value));
    });

    submit({
      agentId,
      model: selectedModel,
      inputs: {
        ...contextData,
        user_query: content,
        project_id: currentProject?.id,
        custom_instructions: processedInstructions,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        token: session?.access_token
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const filePaths: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${session?.user?.id}/${agentId}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('kb_attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        filePaths.push(filePath);
      }

      // Call ingest function (still using Supabase for this part as it's file processing)
      // Note: If we moved everything to Express, we'd need to migrate this too.
      // For now, we assume the Supabase function 'ingest' still exists and works.
      const { error: ingestError } = await supabase.functions.invoke('ingest', {
        body: { filePaths, agentId },
      });

      if (ingestError) throw ingestError;

      // Notify user (system message or toast)
      const sysMsg: Message = {
        role: 'assistant',
        content: `Successfully ingested ${files.length} file(s).`,
        created_at: new Date(),
        agent_id: agentId,
        conversation_id: conversationId,
      };
      setMessages(prev => [...prev, sysMsg]);

    } catch (err: any) {
      console.error('Upload error:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  return (
    <div className="flex flex-col flex-1 relative font-sans h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id || `msg-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 mt-1">
                  {agentData?.branding_config?.app_icon ? (
                    <img src={agentData.branding_config.app_icon} alt={agentData.name} className="w-8 h-8 rounded-lg shadow-md" />
                  ) : (
                    <Bot className="w-8 h-8 text-primary" />
                  )}
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-white/5 backdrop-blur-md border-white/10' : 'bg-black/40 backdrop-blur-xl border-white/5'} border rounded-2xl p-5 shadow-lg relative overflow-hidden group`}>
                {/* Decorative gradient for assistant */}
                {msg.role === 'assistant' && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary/30 to-transparent opacity-50" />
                )}

                {/* Thoughts Accordion (Assistant Only) */}
                {msg.role === 'assistant' && msg.thoughts && msg.thoughts.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <details className="group/thoughts">
                        <summary className="cursor-pointer text-[10px] text-branding/30 uppercase tracking-widest hover:text-branding/50 transition-colors list-none flex items-center gap-2 select-none">
                        <Zap className="w-3 h-3 text-primary/50 group-open/thoughts:text-primary transition-colors" />
                        {agentData?.name || 'Cognitive Trace'}
                      </summary>
                      <div className="mt-3 pl-3 border-l border-white/5 space-y-2">
                        {msg.thoughts.map((thought, tIdx) => (
                          <p key={tIdx} className="text-xs text-branding/40 italic font-mono leading-relaxed">
                            {thought}
                          </p>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* Message Content */}
                <div className="text-sm leading-relaxed text-branding/90">
                  <MarkdownRenderer content={msg.content} />
                </div>

                {/* Suggested Actions (Assistant Only) */}
                {msg.role === 'assistant' && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-white/5">
                    {msg.suggested_actions.map((action, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => handleSendMessage(action)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-xs text-branding/60 hover:text-branding transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="w-1 h-1 rounded-full bg-primary" />
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  {gravatarUrl ? (
                    <img src={gravatarUrl} alt="User" className="w-8 h-8 rounded-lg shadow-md object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Person className="w-5 h-5 text-white/50" />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {/* Streaming Response */}
          {isLoading && object && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary/30 to-transparent animate-pulse" />
                
                {/* Streaming Thoughts */}
                {object.thoughts && object.thoughts.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <div className="text-[10px] text-branding/30 uppercase tracking-widest flex items-center gap-2">
                      <Bot className="w-3 h-3 text-primary animate-pulse" />
                      Processing...
                    </div>
                    <div className="pl-3 border-l border-white/5 space-y-2">
                      {object.thoughts.map((thought, tIdx) => (
                        <motion.p 
                          key={tIdx}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-xs text-branding/40 italic font-mono leading-relaxed"
                        >
                          {thought}
                        </motion.p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Streaming Message */}
                <div className="text-sm leading-relaxed text-branding/90">
                  <MarkdownRenderer content={object.message || ''} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-10">
        <div className="relative max-w-4xl mx-auto space-y-3">
          <div className="relative flex items-end gap-3 bg-[#0a0a0a] border border-white/10 rounded-2xl p-2 shadow-2xl ring-1 ring-white/5">
            {/* File Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isLoading}
              className="p-3 rounded-xl hover:bg-white/5 transition-colors text-branding/40 hover:text-branding flex-shrink-0"
            >
              {isUploading ? (
                <span className="animate-spin block w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={handleFileUpload}
            />

            {/* Text Area */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Agent is responding..." : "Type your message..."}
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent border-none text-branding placeholder-branding/20 focus:ring-0 resize-none py-3 max-h-[200px] min-h-[44px] scrollbar-hide"
              style={{ lineHeight: '1.5' }}
            />

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-branding disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0 group"
            >
              <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          {/* Model Selector & Footer */}
          <div className="flex items-center justify-between px-2">
            <div className="relative">
              <button
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                disabled={validModels.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-[10px] text-branding/50 hover:text-branding/80 transition-all uppercase tracking-wider disabled:opacity-30"
              >
                <BrainCircuit className="w-3 h-3" />
                <span>
                  {validModels.find(m => m.model_string === selectedModel)?.display_name || 
                   validModels.find(m => m.model_string === selectedModel)?.model_string || 
                   (validModels.length > 0 ? 'Select Model' : 'No Models Available')}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isModelMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 bottom-full mb-2 w-56 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl z-50"
                  >
                    <div className="p-1">
                      {validModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.model_string);
                            setIsModelMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between group transition-colors ${
                            selectedModel === model.model_string 
                              ? 'bg-white/10 text-branding' 
                              : 'text-branding/50 hover:bg-white/5 hover:text-branding'
                          }`}
                        >
                          <span>{model.display_name || model.model_string}</span>
                          {selectedModel === model.model_string && <Sparkles className="w-3 h-3 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-[10px] text-branding/20 uppercase tracking-widest">
              Secured by Neural Link Encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

