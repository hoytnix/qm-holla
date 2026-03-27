import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useBranding } from './hooks/useBranding';
import { useStructuredFields } from './hooks/useStructuredFields';
import { AdminMenu } from '@/components/AdminMenu';
import { AuthModal } from './components/AuthModals';
import { DynamicForm } from './components/DynamicForm';
import { ChatInterface } from './components/ChatInterface';
import { ContextModal } from './components/ContextModal';
import { ConfirmModal } from './components/ConfirmModal';
import { TopUpModal } from './components/TopUpModal';
import { GlassButton } from '@/components/ui/GlassButton';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Coins, MoreVertical, Menu, X as Close, ChevronDown, ChevronRight, Home } from 'lucide-react';
import { db, Conversation } from './lib/db';

export default function UserApp() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConvId = searchParams.get('c');

  const { agent, loading: brandingLoading, error: brandingError } = useBranding(agentId);
  const { fields, loading: fieldsLoading } = useStructuredFields(agentId);
  const { session } = useAuth();
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [contextData, setContextData] = useState<Record<string, any>>({});
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  
  // New State
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [credits, setCredits] = useState<number>(0);
  const [conversationId, setConversationId] = useState<string>(initialConvId || crypto.randomUUID());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    async function fetchAllAgents() {
      const { data } = await supabase.from('agents').select('id, name');
      if (data) setAllAgents(data);
    }
    fetchAllAgents();
  }, []);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isAdminMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAdminMenuOpen]);

  // Sync conversationId with URL
  useEffect(() => {
    const c = searchParams.get('c');
    if (c) {
      if (c !== conversationId) {
        setConversationId(c);
      }
      db.messages.where('conversation_id').equals(c).count().then(count => {
        setIsFormSubmitted(count > 0);
      });
    } else {
      setSearchParams({ c: conversationId }, { replace: true });
    }
  }, [searchParams.get('c')]);

  // If session exists, close modal & fetch credits
  useEffect(() => {
    if (session) {
      setIsAuthModalOpen(false);
      fetchCredits();
      fetchConversations();
      checkAdminStatus();
    }
  }, [session, agentId]); // Added agentId to refetch if agent changes

  const checkAdminStatus = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (data && data.role === 'admin') {
      setIsAdmin(true);
    }
  };

  const fetchConversations = async () => {
    const convs = await db.conversations.toArray();
    if (convs.length === 0) {
      const newId = crypto.randomUUID();
      await db.conversations.add({ id: newId, name: 'New Conversation', pinned: false, created_at: new Date(), agent_id: agentId });
      setConversationId(newId);
      setSearchParams({ c: newId }, { replace: true });
      fetchConversations();
      return;
    }
    setConversations(convs);
  };

  const handleRename = async (id: string, name: string) => {
    await db.conversations.update(id, { name });
    fetchConversations();
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    await db.conversations.update(id, { pinned });
    fetchConversations();
  };

  const handleSelectConversation = async (id: string) => {
    const conv = await db.conversations.get(id);
    if (conv && conv.agent_id && conv.agent_id !== agentId) {
      navigate(`/chat/${conv.agent_id}?c=${id}`);
      return;
    }

    setConversationId(id);
    setSearchParams({ c: id }, { replace: true });
    const count = await db.messages.where('conversation_id').equals(id).count();
    if (count > 0) {
      setIsFormSubmitted(true);
    } else {
      setIsFormSubmitted(false);
    }
  };

  const handleDelete = (id: string) => {
    setConversationToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (conversationToDelete) {
        await db.conversations.delete(conversationToDelete);
        await db.messages.where('conversation_id').equals(conversationToDelete).delete();
        fetchConversations();
        if (conversationId === conversationToDelete) {
          const newId = crypto.randomUUID();
          setConversationId(newId);
          setSearchParams({ c: newId }, { replace: true });
        }
        setIsDeleteModalOpen(false);
        setConversationToDelete(null);
    }
  };

  const fetchCredits = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('id', session.user.id)
      .single();
    if (data) setCredits(data.credit_balance);
  };

  if (brandingLoading || fieldsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-branding">
        <div className="animate-pulse tracking-widest text-xs uppercase opacity-50">
          Initializing Neural Link...
        </div>
      </div>
    );
  }

  if (brandingError || !agentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-red-400">
        <div className="tracking-widest text-xs uppercase">
          Connection Failed: {brandingError || 'Agent ID missing'}
        </div>
      </div>
    );
  }

  const showForm = !isFormSubmitted;

  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-branding flex flex-col">
      {/* Background Overlay for readability if image is present */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />

      {/* Admin Menu Trigger */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4">
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
            className="rounded-full w-14 h-14 border-white/20 bg-black/60 hover:bg-white/10 backdrop-blur-2xl shadow-2xl shadow-black/50"
          >
            {isAdminMenuOpen ? <Close size={24} /> : <Menu size={24} />}
          </GlassButton>
        </div>
      )}

      {/* Admin Menu Overlay */}
      <AdminMenu
        isOpen={isAdminMenuOpen}
        onClose={() => setIsAdminMenuOpen(false)}
        onLogout={async () => {
          await supabase.auth.signOut();
          setIsAdminMenuOpen(false);
          window.location.href = '/login';
        }}
      />

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col h-screen w-full">
        
        {/* Header / Top Bar */}
        <header className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-6 border-b border-white/5 bg-black/20 backdrop-blur-sm gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto space-x-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg">
              <span className="text-xl">☰</span>
            </button>
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-lg font-light tracking-wide text-branding">{agent?.name || 'Unknown Agent'}</h1>
              </div>
            </div>

            {/* Mobile Credits (visible only on mobile header row) */}
            {session && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsTopUpModalOpen(true)}
                  className="flex md:hidden items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Coins size={14} className="text-yellow-500" />
                  <span className="text-xs font-mono text-branding/80">{credits}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2 md:gap-4 w-full sm:w-auto flex-wrap">
            {session && (
              <>
                {/* Desktop Credits */}
                <div className="hidden md:flex items-center gap-2">
                  <Link to="/chat" className="text-branding/50 hover:text-branding transition-colors p-1.5">
                    <Home size={16} />
                  </Link>
                  <button 
                    onClick={() => setIsTopUpModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Coins size={14} className="text-yellow-500" />
                    <span className="text-xs font-mono text-branding/80">{credits}</span>
                  </button>
                </div>
              </>
            )}

            {!session ? (
              <GlassButton 
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="text-xs px-6 py-2"
              >
                Connect Identity
              </GlassButton>
            ) : null}
          </div>
        </header>

        {/* Layout: Sidebar + Chat */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar */}
          {isSidebarOpen && (
            <div className="w-64 bg-black/40 border-r border-white/5 p-4 space-y-4 flex flex-col h-full overflow-hidden">
              <div className="space-y-4 flex-shrink-0">
                <GlassButton onClick={() => setIsContextOpen(true)} className="w-full justify-center gap-2" variant="secondary">
                  <FolderOpen size={16} /> Knowledge
                </GlassButton>
                <input 
                  type="text" 
                  placeholder="Search conversations..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-branding"
                />
              </div>
              <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pb-4">
                {Object.entries(
                  conversations
                    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .reduce((acc, c) => {
                      const agent = allAgents.find(a => a.id === c.agent_id);
                      const key = agent ? agent.name : 'Unknown App';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(c);
                      return acc;
                    }, {} as Record<string, Conversation[]>)
                ).map(([groupId, groupConvs]) => (
                  <div key={groupId} className="space-y-1">
                    <button
                      onClick={() => toggleGroup(groupId)}
                      className="flex items-center gap-2 w-full text-left text-[10px] font-medium text-branding/40 uppercase tracking-wider px-2 py-1 hover:text-branding/60 transition-colors"
                    >
                      {collapsedGroups[groupId] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      {groupId}
                    </button>
                    {!collapsedGroups[groupId] && (
                      <div className="space-y-1">
                        {groupConvs.map(c => (
                          <div 
                            key={c.id} 
                            className={`flex items-center justify-between p-2 rounded-lg text-xs ${conversationId === c.id ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-branding'}`}
                          >
                            {editingId === c.id ? (
                              <input 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={() => {
                                  handleRename(c.id, editName);
                                  setEditingId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRename(c.id, editName);
                                    setEditingId(null);
                                  }
                                }}
                                className="flex-1 bg-white/10 border border-white/20 rounded p-1 text-xs text-branding"
                                autoFocus
                              />
                            ) : (
                              <button 
                                onClick={() => handleSelectConversation(c.id)}
                                className="flex-1 text-left truncate"
                              >
                                {c.name}
                              </button>
                            )}
                            <div className="relative">
                              <button type="button" onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)} className="text-branding/30 hover:text-branding">
                                <MoreVertical size={16} />
                              </button>
                              {openMenuId === c.id && (
                                <div className="absolute right-0 mt-1 w-32 bg-zinc-900 border border-white/10 rounded-lg p-1 z-20 shadow-xl">
                                  <button type="button" onClick={() => { handleTogglePin(c.id, !c.pinned); setOpenMenuId(null); }} className="block w-full text-left px-2 py-1.5 text-xs hover:bg-white/5 text-branding/70 hover:text-branding">
                                    {c.pinned ? 'Unpin' : 'Pin'}
                                  </button>
                                  <button type="button" onClick={() => { setEditingId(c.id); setEditName(c.name); setOpenMenuId(null); }} className="block w-full text-left px-2 py-1.5 text-xs hover:bg-white/5 text-branding/70 hover:text-branding">
                                    Rename
                                  </button>
                                  <button type="button" onClick={() => { handleDelete(c.id); setOpenMenuId(null); }} className="block w-full text-left px-2 py-1.5 text-xs hover:bg-white/5 text-red-400">
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Interface - Centered Column */}
          <main className="flex-1 bg-black/10 backdrop-blur-sm flex flex-col border-x border-white/5">
            {!session ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4 max-w-md"
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-6">
                    <span className="text-2xl opacity-50">✨</span>
                  </div>
                  <h2 className="text-2xl font-light text-branding">
                    Welcome to {agent?.name || 'the Interface'}
                  </h2>
                  {agent?.description && (
                    <p 
                      className="text-sm leading-relaxed mt-2 italic"
                      style={{ color: agent.branding_config.primary_font_color ? `${agent.branding_config.primary_font_color}99` : 'rgba(255, 255, 255, 0.6)' }}
                    >
                      {agent.description}
                    </p>
                  )}
                  <p className="text-branding/40 text-sm leading-relaxed mt-4">
                    This is a secure channel. All communications are encrypted and stored locally.
                    Please authenticate to begin the session.
                  </p>
                  
                  <div className="pt-4 flex justify-center space-x-4">
                    <GlassButton 
                      onClick={() => {
                        setAuthMode('register');
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full max-w-[200px]"
                    >
                      Initialize Protocol
                    </GlassButton>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {showForm ? (
                  <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto custom-scrollbar">
                    {agent?.branding_config?.cover_photo && (
                      <div className="w-full max-w-4xl mb-6">
                        <img 
                          src={agent.branding_config.cover_photo} 
                          alt="Cover Photo" 
                          className="w-full h-48 object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <DynamicForm 
                      agentId={agentId!} 
                      agentDescription={agent?.description}
                      onSubmit={async (data) => {
                        const { selectedModel, ...formData } = data;
                        setSelectedModel(selectedModel);
                        const existingConv = await db.conversations.get(conversationId);
                        if (!existingConv) {
                          const newConv = { id: conversationId, name: agent?.name || 'New Conversation', pinned: false, created_at: new Date(), agent_id: agentId };
                          await db.conversations.put(newConv);
                          setConversations(prev => [...prev, newConv]);
                        }
                        
                        setContextData(formData);
                        setIsFormSubmitted(true);
                      }}
                      isSubmitting={false}
                      onSelectKnowledgeBase={() => setIsContextOpen(true)}
                      selectedProjectName={currentProject?.name}
                      allowedModels={agent?.allowed_models}
                      defaultModel={agent?.default_model}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0">
                      <ChatInterface 
                        key={session?.access_token || 'no-session'}
                        agentId={agentId!} 
                        conversationId={conversationId}
                        contextData={contextData} 
                        allowedModels={agent?.allowed_models}
                        defaultModel={selectedModel || agent?.default_model}
                        currentProject={currentProject}
                        agentSystemPrompt={agent?.system_prompt_template}
                        onCreditUpdate={fetchCredits}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Modals */}
        <ContextModal 
          isOpen={isContextOpen}
          onClose={() => setIsContextOpen(false)}
          currentProject={currentProject}
          onSelectProject={(project) => {
            setCurrentProject(project);
            setIsContextOpen(false);
          }}
        />

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Conversation"
          message="Are you sure you want to delete this conversation? This action cannot be undone."
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => setIsAuthModalOpen(false)}
          mode={authMode}
          switchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        />

        <TopUpModal
          isOpen={isTopUpModalOpen}
          onClose={() => setIsTopUpModalOpen(false)}
          currentCredits={credits}
        />
      </div>
    </div>
  );
}
