'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord, KbRecord, DocumentRecord, SearchResult } from '@/lib/db/adapter';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { NotionRichEditor } from '@/components/vault/NotionRichEditor';
import {
  Database,
  Search,
  Plus,
  Trash2,
  FileText,
  FolderPlus,
  BookOpen,
  Sparkles,
  Tag,
  ArrowRight,
  Filter,
  CheckCircle2,
  Layers,
  Shield,
  Folder,
} from 'lucide-react';

export default function VaultPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [kbs, setKbs] = useState<KbRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [selectedKbId, setSelectedKbId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Full-page active document state (Notion-style editor)
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);
  const [isCreatingNewDoc, setIsCreatingNewDoc] = useState(false);

  // New Collection modal
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

  const handleSaveDoc = async (doc: DocumentRecord) => {
    await db.saveDocument(doc);
    // Refresh document list in state
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = doc;
        return next;
      }
      return [doc, ...prev];
    });

    if (activeDoc && activeDoc.id === doc.id) {
      setActiveDoc(doc);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (confirm('Delete this knowledge document from the OPFS SQLite database?')) {
      if (db.deleteDocument) {
        await db.deleteDocument(id);
        if (activeDoc?.id === id) {
          setActiveDoc(null);
          setIsCreatingNewDoc(false);
        }
        await loadAll();
      }
    }
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

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedAgentId !== 'all') {
        const docKb = kbs.find((k) => k.id === doc.kb_id);
        if (doc.agent_id !== selectedAgentId && docKb?.agent_id !== selectedAgentId) {
          return false;
        }
      }
      if (selectedKbId === 'memory-bank') {
        const isMem = Boolean(
          (doc.file_path && doc.file_path.startsWith('/memory-bank/agents/')) ||
          (doc.metadata && doc.metadata.includes('memory-bank')) ||
          doc.id.startsWith('mem-')
        );
        if (!isMem) return false;
      } else if (selectedKbId === 'notes-only') {
        const isMem = Boolean(
          (doc.file_path && doc.file_path.startsWith('/memory-bank/agents/')) ||
          (doc.metadata && doc.metadata.includes('memory-bank')) ||
          doc.id.startsWith('mem-')
        );
        if (isMem) return false;
      } else if (selectedKbId !== 'all' && doc.kb_id !== selectedKbId) {
        return false;
      }
      return true;
    });
  }, [documents, selectedAgentId, selectedKbId, kbs]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
        {/* If an active document is selected or new document is being created, render the full-page Notion editor */}
        {activeDoc || isCreatingNewDoc ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <NotionRichEditor
              initialDocument={activeDoc}
              kbs={kbs}
              agents={agents}
              onSave={handleSaveDoc}
              onDelete={handleDeleteDoc}
              onBack={() => {
                setActiveDoc(null);
                setIsCreatingNewDoc(false);
                loadAll();
              }}
              isFullPage
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-widest text-indigo-400 font-mono font-semibold">
                    Local-First OPFS SQLite
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  <Database className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-400" />
                  <span>Vault Knowledge OS & Docs</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Rich Notion-style Markdown documents stored directly in browser OPFS with SQLite FTS5 BM25 search.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <GlassButton
                  variant="secondary"
                  onClick={() => setIsAddingKb(true)}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>New Collection</span>
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={() => {
                    setActiveDoc(null);
                    setIsCreatingNewDoc(true);
                  }}
                  className="flex items-center gap-2 text-xs sm:text-sm shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Doc</span>
                </GlassButton>
              </div>
            </div>

            {/* FTS5 Fast Search & Collection Filtering */}
            <GlassCard className="p-4 mb-6 bg-slate-900/60 border-white/10">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search docs with SQLite FTS5 (BM25 ranking)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>

                {/* Filter by Officer */}
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-400"
                >
                  <option value="all">All Fleet Officers</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role_title})
                    </option>
                  ))}
                </select>

                {/* Filter by Collection / Memory Bank */}
                <select
                  value={selectedKbId}
                  onChange={(e) => setSelectedKbId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-400"
                >
                  <option value="all">All Vault Documents</option>
                  <option value="memory-bank">Isolated Memory Banks (/memory-bank/agents/*)</option>
                  <option value="notes-only">General Vault Notes & Manifesto</option>
                  <optgroup label="Knowledge Collections">
                    {kbs.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <GlassButton type="submit" variant="primary" className="px-5 text-xs sm:text-sm">
                  Search
                </GlassButton>
              </form>

              {/* FTS5 Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      FTS5 Matches ({searchResults.length})
                    </span>
                    <button
                      onClick={() => setSearchResults([])}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.map((res) => {
                      const matchedDoc = documents.find((d) => d.id === res.id);
                      return (
                        <div
                          key={res.id}
                          onClick={() => {
                            if (matchedDoc) setActiveDoc(matchedDoc);
                          }}
                          className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/30 text-xs cursor-pointer hover:border-indigo-400 transition-colors"
                        >
                          <div className="flex items-center justify-between font-bold text-white text-sm mb-1">
                            <span>{res.title}</span>
                            <ArrowRight width={14} height={14} className="text-indigo-400" />
                          </div>
                          <p className="text-slate-300 line-clamp-3 font-mono text-[11px] leading-relaxed">
                            {res.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Modal: New Knowledge Base / Collection */}
            {isAddingKb && (
              <GlassCard className="p-6 mb-8 border-indigo-500/30 bg-slate-900/95 max-w-xl mx-auto shadow-2xl">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-indigo-400" />
                  <span>Create Knowledge Collection</span>
                </h2>
                <form onSubmit={handleSaveKb} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Collection Name
                    </label>
                    <input
                      value={kbName}
                      onChange={(e) => setKbName(e.target.value)}
                      placeholder="e.g. Navigation Charters & Lore"
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Assign to Fleet Officer
                    </label>
                    <select
                      value={kbAgentId}
                      onChange={(e) => setKbAgentId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.role_title})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                      Description
                    </label>
                    <input
                      value={kbDesc}
                      onChange={(e) => setKbDesc(e.target.value)}
                      placeholder="Scope and purpose of this collection..."
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
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

            {/* Documents Grid */}
            {loading ? (
              <div className="text-center py-20 text-slate-400 font-mono text-sm">
                Accessing OPFS SQLite records...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span>Vault Documents ({filteredDocuments.length})</span>
                  </h2>

                  <span className="text-xs text-slate-400 font-mono">
                    Click any note to open the rich Notion-style editor
                  </span>
                </div>

                {filteredDocuments.length === 0 ? (
                  <GlassCard className="p-10 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-3">
                    <FileText className="w-10 h-10 text-slate-600" />
                    <p>No documents found matching the active filter.</p>
                    <GlassButton
                      variant="primary"
                      onClick={() => {
                        setActiveDoc(null);
                        setIsCreatingNewDoc(true);
                      }}
                      className="text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Create New Note
                    </GlassButton>
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredDocuments.map((doc) => {
                      const kb = kbs.find((k) => k.id === doc.kb_id);
                      const agent = agents.find((a) => a.id === (doc.agent_id || kb?.agent_id));

                      // Parse tags if available
                      let tagsList: string[] = [];
                      if (doc.metadata) {
                        try {
                          const parsed = JSON.parse(doc.metadata);
                          if (Array.isArray(parsed.tags)) tagsList = parsed.tags;
                        } catch {}
                      }

                      return (
                        <GlassCard
                          key={doc.id}
                          onClick={() => setActiveDoc(doc)}
                          className="p-5 flex flex-col justify-between bg-slate-900/50 hover:bg-slate-900/80 hover:border-indigo-500/40 cursor-pointer transition-all duration-200 group"
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-bold text-white text-base line-clamp-1 group-hover:text-indigo-300 transition-colors">
                                {doc.title}
                              </h3>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDoc(doc.id);
                                }}
                                className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Badges / Meta */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              {doc.file_path && doc.file_path.startsWith('/memory-bank/agents/') ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1">
                                  <Shield width={10} height={10} />
                                  <span>{doc.file_path.split('/').pop()}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                                  {kb?.name || 'General Lore'}
                                </span>
                              )}
                              {agent && (
                                <span className="text-[10px] text-slate-400 truncate">
                                  {agent.name.split(' ')[0]}
                                </span>
                              )}
                              {doc.file_path && (
                                <span className="text-[9px] text-slate-500 font-mono truncate max-w-[200px]" title={doc.file_path}>
                                  {doc.file_path}
                                </span>
                              )}
                            </div>

                            {/* Excerpt */}
                            <p className="text-slate-300 text-xs font-mono line-clamp-4 bg-slate-950/50 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                              {doc.content}
                            </p>

                            {/* Tags */}
                            {tagsList.length > 0 && (
                              <div className="flex items-center gap-1 mt-3 flex-wrap">
                                {tagsList.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    className="text-[10px] text-slate-400 font-mono bg-white/5 px-1.5 py-0.5 rounded"
                                  >
                                    #{t}
                                  </span>
                                ))}
                                {tagsList.length > 3 && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    +{tagsList.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span className="flex items-center gap-1 text-indigo-400/80">
                              <Sparkles width={11} height={11} />
                              <span>FTS5 Indexed</span>
                            </span>
                            <span>{doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : 'Just now'}</span>
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
