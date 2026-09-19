'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord, KbRecord, DocumentRecord, SearchResult } from '@/lib/db/adapter';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import {
  Database,
  Search,
  Plus,
  Trash2,
  FileText,
  FolderPlus,
  BookOpen,
  Sparkles,
  Upload,
  CheckCircle,
} from 'lucide-react';

export default function VaultPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [kbs, setKbs] = useState<KbRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // New Document modal/form state
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docKbId, setDocKbId] = useState('');

  // New KB form state
  const [isAddingKb, setIsAddingKb] = useState(false);
  const [kbName, setKbName] = useState('');
  const [kbDesc, setKbDesc] = useState('');
  const [kbAgentId, setKbAgentId] = useState('');

  const loadAll = async () => {
    try {
      await db.init();
      const loadedAgents = await db.getAgents();
      const loadedKbs = await db.getKbs();
      const loadedDocs = db.getAllDocuments ? await db.getAllDocuments() : [];

      setAgents(loadedAgents);
      setKbs(loadedKbs);
      setDocuments(loadedDocs);

      if (loadedKbs.length > 0 && !docKbId) {
        setDocKbId(loadedKbs[0].id);
      }
      if (loadedAgents.length > 0 && !kbAgentId) {
        setKbAgentId(loadedAgents[0].id);
      }
    } catch (e) {
      console.error('Failed to load vault data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const agentFilter = selectedAgentId === 'all' ? undefined : selectedAgentId;
    const results = await db.searchKnowledge(searchQuery, 10, agentFilter);
    setSearchResults(results);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim() || !docKbId) return;

    const newDoc: DocumentRecord = {
      id: `doc-${Date.now().toString(36)}`,
      kb_id: docKbId,
      title: docTitle.trim(),
      content: docContent.trim(),
    };

    await db.saveDocument(newDoc);
    setDocTitle('');
    setDocContent('');
    setIsAddingDoc(false);
    await loadAll();
  };

  const handleSaveKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbName.trim() || !kbAgentId) return;

    const newKb: KbRecord = {
      id: `kb-${Date.now().toString(36)}`,
      agent_id: kbAgentId,
      name: kbName.trim(),
      description: kbDesc.trim() || null,
    };

    await db.saveKb(newKb);
    setKbName('');
    setKbDesc('');
    setIsAddingKb(false);
    await loadAll();
  };

  const handleDeleteDoc = async (id: string) => {
    if (confirm('Delete this knowledge document from the OPFS SQLite database?')) {
      if (db.deleteDocument) {
        await db.deleteDocument(id);
        await loadAll();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-mono font-semibold">
                Local-First OPFS Storage
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Database className="w-8 h-8 text-indigo-400" />
              <span>Vault & Knowledge Base Engine</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Store notes, lore, and documentation in private browser storage. Indexed with SQLite FTS5 BM25.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              variant="secondary"
              onClick={() => {
                setIsAddingKb(true);
                setIsAddingDoc(false);
              }}
              className="flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Collection</span>
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={() => {
                setIsAddingDoc(true);
                setIsAddingKb(false);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Document</span>
            </GlassButton>
          </div>
        </div>

        {/* FTS5 Fast Search Bar */}
        <GlassCard className="p-4 mb-8 bg-slate-900/60 border-white/10">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Full Text Search across local vault (FTS5 BM25 indexing)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-indigo-400"
            >
              <option value="all">All Agent Lore</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <GlassButton type="submit" variant="primary" className="w-full sm:w-auto px-5">
              Search FTS5
            </GlassButton>
          </form>

          {/* Search Results Display */}
          {searchResults.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  FTS5 Ranked Matches ({searchResults.length})
                </span>
                <button
                  onClick={() => setSearchResults([])}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear Results
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-indigo-500/20 text-xs"
                  >
                    <div className="font-bold text-white text-sm mb-1">{res.title}</div>
                    <p className="text-slate-300 line-clamp-3 font-mono text-[11px] leading-relaxed">
                      {res.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Add Knowledge Base Form */}
        {isAddingKb && (
          <GlassCard className="p-6 mb-8 border-indigo-500/30 bg-slate-900/90 max-w-xl mx-auto shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-400" />
              <span>Create New Knowledge Area</span>
            </h2>
            <form onSubmit={handleSaveKb} className="space-y-4">
              <GlassInput
                label="Collection / KB Name"
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
                placeholder="e.g. Ancient Sea Navigation Charters"
                required
              />
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1 block mb-1">
                  Assign to Fleet Officer
                </label>
                <select
                  value={kbAgentId}
                  onChange={(e) => setKbAgentId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role_title})
                    </option>
                  ))}
                </select>
              </div>
              <GlassInput
                label="Description"
                value={kbDesc}
                onChange={(e) => setKbDesc(e.target.value)}
                placeholder="Scope and purpose of this lore base..."
              />
              <div className="flex items-center justify-end gap-3 pt-2">
                <GlassButton type="button" variant="ghost" onClick={() => setIsAddingKb(false)}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary">
                  Create Collection
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Add Document Form */}
        {isAddingDoc && (
          <GlassCard className="p-6 mb-8 border-indigo-500/30 bg-slate-900/90 max-w-2xl mx-auto shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              <span>Insert Document into OPFS Vault</span>
            </h2>
            <form onSubmit={handleSaveDoc} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GlassInput
                  label="Document Title"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Poneglyph Log 01"
                  required
                />
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1 block mb-1">
                    Knowledge Collection
                  </label>
                  <select
                    value={docKbId}
                    onChange={(e) => setDocKbId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                  >
                    {kbs.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1 block mb-1">
                  Document Content (Markdown / Text)
                </label>
                <textarea
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-white font-mono placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 backdrop-blur-md"
                  rows={8}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Paste or write document text here..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <GlassButton type="button" variant="ghost" onClick={() => setIsAddingDoc(false)}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary">
                  Save Document to OPFS
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Existing Documents and Collections */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 font-mono">Loading vault records...</div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>Archived Knowledge Documents ({documents.length})</span>
            </h2>

            {documents.length === 0 ? (
              <GlassCard className="p-8 text-center text-slate-400 text-sm">
                No documents found in the local SQLite database. Click "Add Document" to seed knowledge.
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {documents.map((doc) => {
                  const kb = kbs.find((k) => k.id === doc.kb_id);
                  const agent = agents.find((a) => a.id === kb?.agent_id);

                  return (
                    <GlassCard
                      key={doc.id}
                      className="p-5 flex flex-col justify-between bg-slate-900/50 hover:border-white/20 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-white text-base line-clamp-1">{doc.title}</h3>
                          <GlassButton
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </GlassButton>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                            {kb?.name || 'General Lore'}
                          </span>
                          {agent && (
                            <span className="text-[10px] text-slate-400 truncate">
                              Officer: {agent.name.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        <p className="text-slate-300 text-xs font-mono line-clamp-4 bg-slate-950/40 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                          {doc.content}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>FTS5 Indexed</span>
                        <span>{doc.updated_at || 'Just now'}</span>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
