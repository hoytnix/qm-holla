'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord, MessageRecord } from '@/lib/db/adapter';
import { assembleContext, routeIntent } from '@/lib/ai/orchestrator';
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
} from 'lucide-react';

function ChatContent() {
  const searchParams = useSearchParams();
  const requestedAgentId = searchParams.get('agent');

  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('auto');
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
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

      const savedKey = localStorage.getItem('quark_api_key') || '';
      setApiKey(savedKey);
    }
    init();
  }, [requestedAgentId]);

  const saveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('quark_api_key', key);
  };

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
      const orchestration = await assembleContext(userText, target);

      setActiveTrace(orchestration.delegationPath);

      // 3. Initiate SSE Streaming Request to Next.js route handler
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

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          systemPrompt: orchestration.systemInstruction,
          apiKey: apiKey || undefined,
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
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: accumulated } : m
                    )
                  );
                }
              } catch {}
            }
          }
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-4rem)]">
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
                <option value="auto">⚡ Auto-Orchestrate (Captain Luffy)</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.avatar_url || '⚡'} {a.name} ({a.role_title.split(' ')[0]})
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
            <button
              onClick={() => setShowKeyModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{apiKey ? 'API Key Configured' : 'Set API Key'}</span>
            </button>

            <button
              onClick={handleClearHistory}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-rose-400 transition-all"
              title="Clear thread history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

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
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                🏴‍☠️
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
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-base shrink-0">
                      {agent?.avatar_url || '⚡'}
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

        {/* API Key Modal */}
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <GlassCard className="p-6 max-w-md w-full border-white/20 bg-slate-900/95 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Client Inference Key (Optional)</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Keys are stored strictly inside your browser's <code className="text-indigo-300">localStorage</code>. If blank, Quarkmeme runs in local offline simulation mode with OPFS SQLite.
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => saveKey(e.target.value)}
                placeholder="sk-... (OpenAI) or AIza... (Gemini)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 mb-4"
              />
              <div className="flex justify-end gap-2">
                <GlassButton variant="primary" onClick={() => setShowKeyModal(false)}>
                  Done
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        )}
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
