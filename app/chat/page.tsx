'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord, MessageRecord } from '@/lib/db/adapter';
import { assembleContext, routeIntent } from '@/lib/ai/orchestrator';
import { useSettings } from '@/lib/settings/settings-context';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  Send,
  Sparkles,
  Bot,
  User,
  GitBranch,
  Key,
  Settings,
  Trash2,
  RefreshCw,
  Compass,
  Crown,
  AlertTriangle,
  SlidersHorizontal,
  Search,
  Globe,
  ExternalLink,
  Terminal,
  Code2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react';
import { AgentIcon } from '@/components/ui/AgentIcon';
import {
  readChatStream,
  GroundingMetadata,
  CodeExecutionBlock,
} from '@/lib/ai/tools';

interface ChatMessage extends MessageRecord {
  groundingMetadata?: GroundingMetadata | null;
  codeExecutionBlocks?: CodeExecutionBlock[];
}

function CodeExecutionDisplay({ block }: { block: CodeExecutionBlock }) {
  const [isOpen, setIsOpen] = useState(true);
  const isSuccess = block.outcome === 'OUTCOME_OK' || !block.outcome || block.outcome.includes('OK');

  return (
    <div className="my-2 rounded-xl border border-white/10 bg-slate-950/70 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between bg-slate-900/90 hover:bg-slate-800/80 transition-colors border-b border-white/5"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" width={14} height={14} />
          <span className="font-mono font-semibold text-slate-200">
            Code Execution ({block.language || 'Python'})
          </span>
          {block.outcome && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                isSuccess
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isSuccess ? 'Executed' : block.outcome}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[10px] hidden sm:inline">{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5" width={14} height={14} />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" width={14} height={14} />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 space-y-2 font-mono text-[11px]">
          {block.code && (
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-sans font-medium flex items-center gap-1.5">
                <Code2 className="w-3 h-3 text-cyan-400 shrink-0" width={12} height={12} />
                <span>Executable Script:</span>
              </div>
              <pre className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-cyan-200 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                <code>{block.code}</code>
              </pre>
            </div>
          )}

          {block.output && (
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-sans font-medium flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" width={12} height={12} />
                <span>Console Output:</span>
              </div>
              <pre className="p-2.5 rounded-lg bg-black/90 border border-white/5 text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                <code>{block.output}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroundingDisplay({ metadata }: { metadata: GroundingMetadata }) {
  const sources = (metadata.groundingChunks || [])
    .map((c) => c.web)
    .filter((w): w is NonNullable<typeof w> => Boolean(w && w.uri));

  const uniqueSources = Array.from(new Map(sources.map((s) => [s.uri, s])).values());
  const queries = metadata.webSearchQueries || [];

  if (uniqueSources.length === 0 && queries.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs">
      {queries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" width={14} height={14} />
          <span className="font-semibold text-slate-300">Grounding Searches:</span>
          {queries.map((q, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 font-mono text-[10px]"
            >
              {q}
            </span>
          ))}
        </div>
      )}

      {uniqueSources.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" width={14} height={14} />
            <span>Web Sources ({uniqueSources.length}):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {uniqueSources.map((source, idx) => {
              let domain = '';
              try {
                if (source.uri) domain = new URL(source.uri).hostname.replace('www.', '');
              } catch {}

              return (
                <a
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-950/20 transition-all text-xs group"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[9px] font-mono text-slate-400 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate text-slate-300 group-hover:text-emerald-300 font-medium">
                      {source.title || domain || source.uri}
                    </span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0" width={12} height={12} />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const requestedAgentId = searchParams.get('agent');

  const { config, isConfigured, themeVersion, activeCompany, themeConfig } = useSettings();

  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('auto');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTrace, setActiveTrace] = useState<string[]>([]);

  const threadId = 'grand-line-main-thread';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function init() {
      await db.init();
      const list = await db.getAgents();
      setAgents(list);

      if (requestedAgentId) {
        setSelectedAgentId(requestedAgentId);
      }

      const history = await db.getMessages(threadId);
      const parsed: ChatMessage[] = history.map((m) => {
        let groundingMetadata: GroundingMetadata | null = null;
        let codeExecutionBlocks: CodeExecutionBlock[] = [];
        if (m.grounding_metadata) {
          try {
            groundingMetadata = JSON.parse(m.grounding_metadata);
          } catch {}
        }
        if (m.code_execution) {
          try {
            codeExecutionBlocks = JSON.parse(m.code_execution);
          } catch {}
        }
        return {
          ...m,
          groundingMetadata,
          codeExecutionBlocks,
        };
      });
      setMessages(parsed);
    }
    init();
  }, [requestedAgentId]);

  // Reload agents when theme changes
  useEffect(() => {
    if (themeVersion === 0) return;
    async function reload() {
      await db.init();
      const list = await db.getAgents();
      setAgents(list);
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeVersion]);

  const handleClearHistory = async () => {
    if (confirm('Clear local chat history stored in SQLite?')) {
      if (db.clearMessages) {
        await db.clearMessages(threadId);
      }
      setMessages([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isStreaming) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');

    // 1. Save user message to SQLite
    const userMsg: MessageRecord = {
      id: `msg-${Date.now().toString(36)}-u`,
      thread_id: threadId,
      sender_type: 'user',
      content: userText,
    };
    await db.saveMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);

    setIsStreaming(true);

    try {
      // 2. Multi-Agent Context Assembly & Orchestration Routing
      const target = selectedAgentId === 'auto' ? undefined : selectedAgentId;
      const orchestration = await assembleContext(userText, target, config.systemPrompt);

      setActiveTrace(orchestration.delegationPath);

      // 3. Initiate Streaming Request to Next.js route handler with ephemeral headers
      const assistantMsgId = `msg-${Date.now().toString(36)}-a`;
      let currentGrounding: GroundingMetadata | null = null;
      let currentCodeBlocks: CodeExecutionBlock[] = [];

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        thread_id: threadId,
        sender_type: 'agent',
        agent_id: orchestration.targetAgent.id,
        content: '',
        delegation_trace: JSON.stringify(orchestration.delegationPath),
        groundingMetadata: null,
        codeExecutionBlocks: [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const activeModel = orchestration.targetAgent.model || orchestration.customModel || config.model;
      if (config.apiKey) headers['x-llm-api-key'] = config.apiKey;
      if (config.provider) headers['x-llm-provider'] = config.provider;
      if (activeModel) headers['x-llm-model'] = activeModel;
      if (config.baseUrl) headers['x-llm-base-url'] = config.baseUrl;

      const activeTools = orchestration.tools || orchestration.targetAgent.tools;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          systemPrompt: orchestration.systemInstruction,
          tools: activeTools,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      let accumulated = '';

      if (reader) {
        accumulated = await readChatStream(reader, (event) => {
          if (event.type === 'text') {
            accumulated += event.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: accumulated } : m
              )
            );
          } else if (event.type === 'executable_code') {
            const codePart = event.executableCode;
            const existingIdx = codePart.id
              ? currentCodeBlocks.findIndex((b) => b.id === codePart.id)
              : -1;
            if (existingIdx >= 0) {
              currentCodeBlocks[existingIdx] = {
                ...currentCodeBlocks[existingIdx],
                code: codePart.code || '',
                language: codePart.language || 'python',
              };
            } else {
              currentCodeBlocks = [
                ...currentCodeBlocks,
                {
                  id: codePart.id,
                  code: codePart.code || '',
                  language: codePart.language || 'python',
                },
              ];
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, codeExecutionBlocks: [...currentCodeBlocks] }
                  : m
              )
            );
          } else if (event.type === 'code_execution_result') {
            const resPart = event.codeExecutionResult;
            const existingIdx = resPart.id
              ? currentCodeBlocks.findIndex((b) => b.id === resPart.id)
              : currentCodeBlocks.length - 1;
            if (existingIdx >= 0) {
              currentCodeBlocks[existingIdx] = {
                ...currentCodeBlocks[existingIdx],
                outcome: resPart.outcome,
                output: resPart.output,
              };
            } else {
              currentCodeBlocks = [
                ...currentCodeBlocks,
                {
                  id: resPart.id,
                  code: '',
                  outcome: resPart.outcome,
                  output: resPart.output,
                },
              ];
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, codeExecutionBlocks: [...currentCodeBlocks] }
                  : m
              )
            );
          } else if (event.type === 'grounding_metadata') {
            currentGrounding = {
              ...currentGrounding,
              ...event.groundingMetadata,
              webSearchQueries: [
                ...new Set([
                  ...(currentGrounding?.webSearchQueries || []),
                  ...(event.groundingMetadata.webSearchQueries || []),
                ]),
              ],
              groundingChunks: [
                ...(currentGrounding?.groundingChunks || []),
                ...(event.groundingMetadata.groundingChunks || []),
              ],
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, groundingMetadata: currentGrounding }
                  : m
              )
            );
          }
        });
      }

      // 4. Save completed agent response into SQLite with grounding and code execution
      assistantMsg.content = accumulated;
      assistantMsg.grounding_metadata = currentGrounding
        ? JSON.stringify(currentGrounding)
        : null;
      assistantMsg.code_execution =
        currentCodeBlocks.length > 0
          ? JSON.stringify(currentCodeBlocks)
          : null;
      await db.saveMessage(assistantMsg);
    } catch (err: any) {
      console.error('Chat execution failed:', err);
      const errorMsg: MessageRecord = {
        id: `msg-${Date.now().toString(36)}-err`,
        thread_id: threadId,
        sender_type: 'orchestrator',
        content: `Error during agent execution: ${err.message || String(err)}`,
      };
      await db.saveMessage(errorMsg);
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const captainAgent = agents.find((a) => !a.parent_agent_id) || agents[0];
  const profileCeoName = activeCompany?.owners?.trim()
    ? activeCompany.owners.split(/[,&/]/)[0].trim()
    : (captainAgent?.name ? captainAgent.name.split(' ')[0] : (themeConfig?.leaderTitle || 'CEO'));
  const leaderTitle = themeConfig?.leaderTitle || 'Captain';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col min-h-0 md:h-[calc(100vh-4rem)]">
        {/* Chat Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Fleet Destination:
              </span>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400"
              >
                <option value="auto">
                  Auto-Orchestrate ({leaderTitle} {profileCeoName})
                </option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role_title.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            {selectedAgent && selectedAgentId !== 'auto' && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[11px] text-indigo-300 font-mono">
                  Direct: {selectedAgent.role_title}
                </span>
                {selectedAgent.tools && (
                  <div className="flex items-center gap-1">
                    {selectedAgent.tools.googleSearch && (
                      <span
                        title="Google Search Grounding enabled"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono"
                      >
                        <Search className="w-2.5 h-2.5" width={10} height={10} />
                        <span>Search</span>
                      </span>
                    )}
                    {selectedAgent.tools.codeExecution && (
                      <span
                        title="Code Execution enabled"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono"
                      >
                        <Terminal className="w-2.5 h-2.5" width={10} height={10} />
                        <span>Code</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>{isConfigured ? 'Fuel Settings' : 'Configure Key'}</span>
              {!isConfigured && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
              )}
            </Link>

            <button
              onClick={handleClearHistory}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-rose-400 transition-all"
              title="Clear thread history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unconfigured Key Interceptor Notification Card */}
        {!isConfigured && (
          <div className="my-3 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Engine offline: Configure your API Key in Settings to speak with Luffy and activate live LLM streaming.
              </span>
            </div>
            <Link
              href="/settings"
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
            >
              Configure Fuel
            </Link>
          </div>
        )}

        {/* Trace banner */}
        {activeTrace.length > 0 && (
          <div className="py-2 px-3 my-2 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2 font-mono">
            <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-400">Delegation Hops:</span>
            <span>{activeTrace.join(' → ')}</span>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(99,102,241,0.2)] text-amber-400">
                <Crown width={32} height={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                Grand Line Helm Awaits Your Order
              </h2>
              <p className="text-sm text-slate-400 max-w-md">
                Send a directive. Captain Luffy and the specialized crew will route your intent, consult local OPFS knowledge, and formulate action plans.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.sender_type === 'user';
              const agent = agents.find((a) => a.id === m.agent_id);
              let traceHops: string[] = [];
              if (m.delegation_trace) {
                try {
                  traceHops = JSON.parse(m.delegation_trace);
                } catch {}
              }

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-cyan-300 shrink-0">
                      <AgentIcon agentId={agent?.id} role={agent?.role_title} width={18} height={18} />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-1`}>
                    {!isUser && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono px-1">
                        <span className="font-semibold text-slate-200">
                          {agent?.name || 'Grand Line Orchestrator'}
                        </span>
                        {traceHops.length > 0 && (
                          <span className="text-indigo-400">
                            ({traceHops.join(' → ')})
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-xs shadow-md shadow-indigo-600/20'
                          : 'bg-slate-900/80 border border-white/10 text-slate-200 rounded-bl-xs'
                      }`}
                    >
                      {m.content && <p className="whitespace-pre-wrap font-sans">{m.content}</p>}

                      {!isUser && (
                        <>
                          {m.codeExecutionBlocks && m.codeExecutionBlocks.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {m.codeExecutionBlocks.map((block, idx) => (
                                <CodeExecutionDisplay key={block.id || idx} block={block} />
                              ))}
                            </div>
                          )}

                          {m.groundingMetadata && (
                            <GroundingDisplay metadata={m.groundingMetadata} />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="pt-2 flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isStreaming}
            placeholder={
              isStreaming
                ? 'Autonomous crew responding...'
                : 'Send directive to the Quarkmeme crew...'
            }
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
          />
          <GlassButton
            type="submit"
            disabled={isStreaming || !inputPrompt.trim()}
            variant="primary"
            className="px-5 py-3 flex items-center gap-2"
          >
            {isStreaming ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Dispatch</span>
          </GlassButton>
        </form>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs">
          Loading Grand Line Helm...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
