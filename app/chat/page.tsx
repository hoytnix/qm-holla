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
} from 'lucide-react';
import { AgentIcon } from '@/components/ui/AgentIcon';

function ChatContent() {
  const searchParams = useSearchParams();
  const requestedAgentId = searchParams.get('agent');

  const { config, isConfigured, themeVersion, activeCompany, themeConfig } = useSettings();

  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('auto');
  const [messages, setMessages] = useState<MessageRecord[]>([]);
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
      setMessages(history);
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
      const assistantMsg: MessageRecord = {
        id: assistantMsgId,
        thread_id: threadId,
        sender_type: 'agent',
        agent_id: orchestration.targetAgent.id,
        content: '',
        delegation_trace: JSON.stringify(orchestration.delegationPath),
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

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          systemPrompt: orchestration.systemInstruction,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: accumulated } : m
            )
          );
        }
      }

      // 4. Save completed agent response into SQLite
      assistantMsg.content = accumulated;
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
              <span className="hidden sm:inline-block text-[11px] text-indigo-300 font-mono">
                Direct: {selectedAgent.role_title}
              </span>
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
                      <p className="whitespace-pre-wrap font-sans">{m.content}</p>
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
