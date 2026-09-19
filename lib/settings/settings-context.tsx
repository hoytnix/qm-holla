'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/db/opfs-adapter';
import { AppTheme, ThemeConfig, THEMES, DEFAULT_THEME } from '@/lib/settings/themes';
import { getThemedAgents } from '@/lib/crew/theme-mapper';
import { CompanyProfile } from '@/lib/db/adapter';
import { testGeminiConnection } from '@/lib/ai/client-runner';

export type LLMProvider = 'openrouter' | 'gemini' | 'openai_compatible';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  requestsPerMinute: number;
  systemPrompt: string;
}

export interface SettingsContextValue {
  config: LLMConfig;
  updateConfig: (partial: Partial<LLMConfig>) => Promise<void>;
  isConfigured: boolean;
  isLoading: boolean;
  testConnection: () => Promise<{ success: boolean; latencyMs?: number; error?: string }>;
  flushLocalStorage: () => Promise<void>;
  exportVaultData: () => Promise<string>;

  // Theme management
  currentTheme: AppTheme;
  themeConfig: ThemeConfig;
  hasSelectedTheme: boolean;
  setTheme: (theme: AppTheme) => Promise<void>;
  dismissThemeModal: () => void;
  openThemeModal: () => void;

  // Custom Universe & LLM API Key helpers
  llmApiKey: string;
  customUniverseQuery: string;
  isLlmConfigured: boolean;
  setLlmApiKey: (key: string) => Promise<void>;
  setCustomUniverseQuery: (query: string) => Promise<void>;
  setCustomThemeConfig: (customConfig: ThemeConfig) => Promise<void>;

  // Reactive version counter: bumps on every theme or profile change so pages reload agent data
  themeVersion: number;

  // Phase 0: LLM Verification Gate
  isLlmVerified: boolean;
  setIsLlmVerified: (verified: boolean) => Promise<void>;
  isLlmModalOpen: boolean;
  openLlmModal: () => void;
  closeLlmModal: () => void;

  // Phase 1 & 2: Multi-Tenant Company Profiles
  companies: CompanyProfile[];
  activeCompany: CompanyProfile | null;
  activeCompanyId: string | null;
  switchCompany: (companyId: string) => Promise<void>;
  createCompany: (data: {
    name: string;
    owners: string;
    mission_vision: string;
    initialTodos?: string[];
  }) => Promise<CompanyProfile>;
  updateCompany: (profile: CompanyProfile) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  isCompanyModalOpen: boolean;
  openCompanyModal: () => void;
  closeCompanyModal: () => void;
}

export const DEFAULT_GLOBAL_SYSTEM_PROMPT = `You are an elite autonomous AI operating inside Quarkmeme, a sovereign, local-first multi-agent operating system.
Your guidelines:
1. Ground your reasoning strictly in the provided local knowledge context and user directives.
2. Deliver direct, actionable, structured insights and high-craft deliverables.
3. Respect multi-agent domain boundaries and maintain seamless inter-agent collaboration.
4. Protect user sovereignty, local data privacy, and zero-telemetry guarantees.`.trim();

export const DEFAULT_CONFIG: LLMConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.5-flash',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  temperature: 0.7,
  maxTokens: 2048,
  requestsPerMinute: 4,
  systemPrompt: DEFAULT_GLOBAL_SYSTEM_PROMPT,
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const STORAGE_CACHE_KEY = 'quark_llm_config_cache';
const STORAGE_THEME_KEY = 'quark_app_theme';
const STORAGE_THEME_SELECTED_KEY = 'quark_has_selected_theme';
const STORAGE_CUSTOM_QUERY_KEY = 'quark_custom_universe_query';
const STORAGE_CUSTOM_THEME_CONFIG_KEY = 'quark_custom_theme_config';
const STORAGE_IS_LLM_VERIFIED_KEY = 'quark_is_llm_verified';
const STORAGE_ACTIVE_COMPANY_KEY = 'quark_active_company_id';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTheme, setCurrentThemeState] = useState<AppTheme>(DEFAULT_THEME);
  const [hasSelectedTheme, setHasSelectedTheme] = useState<boolean>(true); // Default true until verified on client to avoid flash
  const [customUniverseQuery, setCustomUniverseQueryState] = useState<string>('');
  const [customThemeConfig, setCustomThemeConfig] = useState<ThemeConfig | null>(null);
  const [themeVersion, setThemeVersion] = useState(0);

  // Phase 0: LLM Gate state
  const [isLlmVerified, setIsLlmVerifiedState] = useState<boolean>(false);
  const [isLlmModalOpen, setIsLlmModalOpen] = useState<boolean>(false);

  // Phase 1 & 2: Company Profiles state
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeCompany, setActiveCompany] = useState<CompanyProfile | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);
  const [isThemeModalForcedOpen, setIsThemeModalForcedOpen] = useState<boolean>(false);

  const hasLoadedRef = React.useRef(false);

  // Hydrate settings, theme, verification, and company profiles
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    let mounted = true;

    async function load() {
      // 1. Fast cache fallback from localStorage
      if (typeof window !== 'undefined') {
        try {
          const cachedTheme = localStorage.getItem(STORAGE_THEME_KEY) as AppTheme | null;
          const cachedHasSelected = localStorage.getItem(STORAGE_THEME_SELECTED_KEY);
          const cachedCustomQuery = localStorage.getItem(STORAGE_CUSTOM_QUERY_KEY);
          const cachedCustomTheme = localStorage.getItem(STORAGE_CUSTOM_THEME_CONFIG_KEY);
          const cachedVerified = localStorage.getItem(STORAGE_IS_LLM_VERIFIED_KEY);
          const cachedActiveCompany = localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY);

          if (cachedCustomTheme && mounted) {
            try {
              setCustomThemeConfig(JSON.parse(cachedCustomTheme));
            } catch {}
          }

          if (cachedCustomQuery && mounted) {
            setCustomUniverseQueryState(cachedCustomQuery);
          }

          if (cachedTheme && (THEMES[cachedTheme] || cachedTheme === 'custom')) {
            if (mounted) setCurrentThemeState(cachedTheme);
          }

          if (cachedHasSelected === null) {
            if (mounted) setHasSelectedTheme(false);
          } else {
            if (mounted) setHasSelectedTheme(cachedHasSelected === 'true');
          }

          if (cachedActiveCompany && mounted) {
            setActiveCompanyId(cachedActiveCompany);
          }

          const cached = localStorage.getItem(STORAGE_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (mounted) {
              setConfig((prev) => ({ ...prev, ...parsed }));
              // If API key is present and verified cache is true
              if (cachedVerified === 'true' && parsed.apiKey) {
                setIsLlmVerifiedState(true);
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse cached LLM settings or theme:', e);
        }
      }

      // 2. Authoritative load from OPFS SQLite
      try {
        await db.init();
        const settings = await db.getAllSettings();
        if (mounted && settings && Object.keys(settings).length > 0) {
          const loaded: Partial<LLMConfig> = {};
          if (settings['llm_provider']) loaded.provider = settings['llm_provider'] as LLMProvider;
          if (settings['llm_api_key'] !== undefined) loaded.apiKey = settings['llm_api_key'];
          if (settings['llm_model']) loaded.model = settings['llm_model'];
          if (settings['llm_base_url'] !== undefined) loaded.baseUrl = settings['llm_base_url'];
          if (settings['llm_temperature']) loaded.temperature = parseFloat(settings['llm_temperature']);
          if (settings['llm_max_tokens']) loaded.maxTokens = parseInt(settings['llm_max_tokens'], 10);
          if (settings['llm_rpm']) loaded.requestsPerMinute = parseInt(settings['llm_rpm'], 10);
          if (settings['llm_system_prompt'] !== undefined) loaded.systemPrompt = settings['llm_system_prompt'];

          if (settings['custom_universe_query'] !== undefined) {
            setCustomUniverseQueryState(settings['custom_universe_query']);
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_CUSTOM_QUERY_KEY, settings['custom_universe_query']);
            }
          }

          if (settings['custom_theme_config'] !== undefined) {
            try {
              const parsedConfig = JSON.parse(settings['custom_theme_config']);
              setCustomThemeConfig(parsedConfig);
              if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_CUSTOM_THEME_CONFIG_KEY, settings['custom_theme_config']);
              }
            } catch {}
          }

          if (settings['app_theme'] && (THEMES[settings['app_theme'] as AppTheme] || settings['app_theme'] === 'custom')) {
            const themeVal = settings['app_theme'] as AppTheme;
            setCurrentThemeState(themeVal);
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_THEME_KEY, themeVal);
            }
          }

          if (settings['has_selected_theme'] !== undefined) {
            const hasSelected = settings['has_selected_theme'] === 'true';
            setHasSelectedTheme(hasSelected);
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_THEME_SELECTED_KEY, String(hasSelected));
            }
          }

          // Check if LLM was previously verified
          const verified =
            (settings['is_llm_verified'] === 'true' ||
              (typeof window !== 'undefined' && localStorage.getItem(STORAGE_IS_LLM_VERIFIED_KEY) === 'true')) &&
            Boolean((loaded.apiKey || config.apiKey)?.trim());

          setIsLlmVerifiedState(Boolean(verified));

          setConfig((prev) => {
            const merged = { ...prev, ...loaded };
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(merged));
            }
            return merged;
          });
        }

        // Load Company Profiles from SQLite
        if (db.getCompanyProfiles) {
          const loadedProfiles = await db.getCompanyProfiles();
          if (mounted) {
            setCompanies(loadedProfiles);
            const savedActiveId =
              (await db.getActiveCompanyProfileId?.()) ||
              (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY) : null);

            let selected = loadedProfiles.find((p) => p.id === savedActiveId) || loadedProfiles[0] || null;
            if (selected) {
              setActiveCompanyId(selected.id);
              setActiveCompany(selected);
              if (selected.theme && THEMES[selected.theme as AppTheme]) {
                setCurrentThemeState(selected.theme as AppTheme);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load settings or company profiles from OPFS SQLite:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [config.apiKey]);

  const setIsLlmVerified = useCallback(async (verified: boolean) => {
    setIsLlmVerifiedState(verified);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_IS_LLM_VERIFIED_KEY, String(verified));
      } catch {}
    }
    try {
      await db.init();
      await db.setSetting('is_llm_verified', String(verified));
    } catch (e) {
      console.warn('Failed to persist is_llm_verified to SQLite:', e);
    }
  }, []);

  const openLlmModal = useCallback(() => setIsLlmModalOpen(true), []);
  const closeLlmModal = useCallback(() => setIsLlmModalOpen(false), []);
  const openCompanyModal = useCallback(() => setIsCompanyModalOpen(true), []);
  const closeCompanyModal = useCallback(() => setIsCompanyModalOpen(false), []);
  const openThemeModal = useCallback(() => setIsThemeModalForcedOpen(true), []);

  const setTheme = useCallback(
    async (theme: AppTheme) => {
      if (!THEMES[theme]) return;
      setCurrentThemeState(theme);
      setHasSelectedTheme(true);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_THEME_KEY, theme);
          localStorage.setItem(STORAGE_THEME_SELECTED_KEY, 'true');
        } catch {}
      }

      try {
        await db.init();
        await db.setSetting('app_theme', theme);
        await db.setSetting('has_selected_theme', 'true');

        // If an active company exists, persist this theme to that company profile
        if (activeCompany) {
          const updatedCompany: CompanyProfile = {
            ...activeCompany,
            theme,
            updated_at: new Date().toISOString(),
          };
          await db.saveCompanyProfile?.(updatedCompany);
          setActiveCompany(updatedCompany);
          setCompanies((prev) => prev.map((c) => (c.id === updatedCompany.id ? updatedCompany : c)));
        }

        // Write themed agents to the database (non-custom themes only;
        // custom themes are written directly by the AI mapper in ThemeSelectionModal)
        const themedAgents = getThemedAgents(theme);
        if (themedAgents) {
          const existingAgents = await db.getAgents();
          const agentModelMap = new Map(existingAgents.map((a) => [a.id, a.model]));
          for (const agent of themedAgents) {
            const existingModel = agentModelMap.get(agent.id);
            await db.saveAgent({
              ...agent,
              model: existingModel || agent.model || null,
            });
          }
        }
      } catch (err) {
        console.warn('Failed to persist theme to OPFS SQLite:', err);
      }

      // Bump version so consuming pages reactively reload agents from DB
      setThemeVersion((v) => v + 1);
    },
    [activeCompany]
  );

  const dismissThemeModal = useCallback(() => {
    setHasSelectedTheme(true);
    setIsThemeModalForcedOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_THEME_SELECTED_KEY, 'true');
      } catch {}
    }
    db.init().then(() => {
      db.setSetting('has_selected_theme', 'true').catch(() => {});
    });
  }, []);

  const updateConfig = useCallback(async (partial: Partial<LLMConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    try {
      await db.init();
      if (partial.provider !== undefined) await db.setSetting('llm_provider', partial.provider);
      if (partial.apiKey !== undefined) await db.setSetting('llm_api_key', partial.apiKey);
      if (partial.model !== undefined) await db.setSetting('llm_model', partial.model);
      if (partial.baseUrl !== undefined) await db.setSetting('llm_base_url', partial.baseUrl);
      if (partial.temperature !== undefined) await db.setSetting('llm_temperature', String(partial.temperature));
      if (partial.maxTokens !== undefined) await db.setSetting('llm_max_tokens', String(partial.maxTokens));
      if (partial.requestsPerMinute !== undefined) await db.setSetting('llm_rpm', String(partial.requestsPerMinute));
      if (partial.systemPrompt !== undefined) await db.setSetting('llm_system_prompt', partial.systemPrompt);
    } catch (err) {
      console.warn('Failed to persist settings to OPFS SQLite:', err);
    }
  }, []);

  const testConnection = useCallback(async (): Promise<{
    success: boolean;
    latencyMs?: number;
    error?: string;
  }> => {
    try {
      const res = await testGeminiConnection(
        config.apiKey,
        config.model || 'gemini-2.5-flash',
        config.baseUrl
      );

      if (res.success) {
        await setIsLlmVerified(true);
      }

      return res;
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Connection attempt failed',
      };
    }
  }, [config, setIsLlmVerified]);

  const setLlmApiKey = useCallback(
    async (key: string) => {
      await updateConfig({ apiKey: key.trim() });
    },
    [updateConfig]
  );

  const setCustomUniverseQuery = useCallback(async (query: string) => {
    setCustomUniverseQueryState(query);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CUSTOM_QUERY_KEY, query);
      } catch {}
    }
    try {
      await db.init();
      await db.setSetting('custom_universe_query', query);
    } catch (err) {
      console.warn('Failed to persist custom universe query to OPFS SQLite:', err);
    }
  }, []);

  const setCustomThemeConfigAction = useCallback(async (customConfig: ThemeConfig) => {
    setCustomThemeConfig(customConfig);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CUSTOM_THEME_CONFIG_KEY, JSON.stringify(customConfig));
      } catch {}
    }
    try {
      await db.init();
      await db.setSetting('custom_theme_config', JSON.stringify(customConfig));
    } catch (err) {
      console.warn('Failed to persist custom theme config to OPFS SQLite:', err);
    }
  }, []);

  // Multi-tenant Company Profile management
  const refreshCompanies = useCallback(async () => {
    try {
      await db.init();
      if (db.getCompanyProfiles) {
        const profiles = await db.getCompanyProfiles();
        setCompanies(profiles);
        const activeId =
          (await db.getActiveCompanyProfileId?.()) ||
          (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY) : null);
        const matched = profiles.find((p) => p.id === activeId) || profiles[0] || null;
        if (matched) {
          setActiveCompanyId(matched.id);
          setActiveCompany(matched);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh company profiles:', err);
    }
  }, []);

  const switchCompany = useCallback(
    async (companyId: string) => {
      const target = companies.find((c) => c.id === companyId);
      if (!target) return;

      setActiveCompanyId(companyId);
      setActiveCompany(target);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, companyId);
        } catch {}
      }

      try {
        await db.init();
        await db.setActiveCompanyProfileId?.(companyId);

        // Switch to the company's designated universe theme
        if (target.theme && THEMES[target.theme as AppTheme]) {
          await setTheme(target.theme as AppTheme);
        }

        if (target.custom_universe_query) {
          await setCustomUniverseQuery(target.custom_universe_query);
        }

        if (target.custom_theme_config) {
          try {
            await setCustomThemeConfigAction(JSON.parse(target.custom_theme_config));
          } catch {}
        }
      } catch (err) {
        console.warn('Failed to switch company profile:', err);
      }

      setThemeVersion((v) => v + 1);
    },
    [companies, setTheme, setCustomUniverseQuery, setCustomThemeConfigAction]
  );

  const createCompany = useCallback(
    async (data: {
      name: string;
      owners: string;
      mission_vision: string;
      initialTodos?: string[];
    }): Promise<CompanyProfile> => {
      await db.init();
      const newProfile: CompanyProfile = {
        id: `comp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: data.name.trim(),
        owners: data.owners.trim(),
        mission_vision: data.mission_vision.trim(),
        theme: currentTheme || 'one-piece',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (db.saveCompanyProfile) {
        await db.saveCompanyProfile(newProfile);
      }
      if (db.setActiveCompanyProfileId) {
        await db.setActiveCompanyProfileId(newProfile.id);
      }

      // Seed initial tasks if provided
      if (data.initialTodos && data.initialTodos.length > 0) {
        for (let i = 0; i < data.initialTodos.length; i++) {
          const todoTitle = data.initialTodos[i].trim();
          if (!todoTitle) continue;
          await db.saveTask({
            id: `task-${newProfile.id}-${i}-${Date.now().toString(36)}`,
            project_id: 'proj-manifesto',
            agent_id: 'captain-core',
            title: todoTitle,
            status: 'pending',
            priority: i === 0 ? 'high' : 'medium',
            company_id: newProfile.id,
          });
        }
      }

      // Create a Founding Charter Document in Vault
      await db.saveDocument({
        id: `doc-${newProfile.id}-charter`,
        project_id: 'proj-manifesto',
        agent_id: 'captain-core',
        title: `${newProfile.name} - Founding Charter & Principles.md`,
        content: `# ${newProfile.name} — Founding Charter & Operating Principles\n\n> "Sovereign operations begin with absolute clarity of mission."\n\n## Leadership\n- **Owners / Executive Sponsors**: ${newProfile.owners}\n- **Established**: ${new Date().toLocaleDateString()}\n\n## Mission, Vision & Principles\n${newProfile.mission_vision}\n\n## Initial Strategic Objectives\n${(data.initialTodos || []).map((t, idx) => `${idx + 1}. [ ] ${t}`).join('\n') || 'None configured yet.'}\n\n---\n*Persisted locally via Quarkmeme OPFS SQLite Sovereign Engine.*`,
        company_id: newProfile.id,
        metadata: JSON.stringify({
          tags: ['charter', 'company', newProfile.id],
          author: newProfile.owners,
          isCompanyCharter: true,
        }),
      });

      setCompanies((prev) => [...prev, newProfile]);
      setActiveCompanyId(newProfile.id);
      setActiveCompany(newProfile);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, newProfile.id);
        } catch {}
      }

      setThemeVersion((v) => v + 1);
      return newProfile;
    },
    [currentTheme]
  );

  const updateCompany = useCallback(async (profile: CompanyProfile) => {
    await db.init();
    if (db.saveCompanyProfile) {
      await db.saveCompanyProfile(profile);
    }
    setCompanies((prev) => prev.map((c) => (c.id === profile.id ? profile : c)));
    if (activeCompanyId === profile.id) {
      setActiveCompany(profile);
    }
  }, [activeCompanyId]);

  const deleteCompany = useCallback(
    async (companyId: string) => {
      if (companies.length <= 1) {
        throw new Error('Cannot delete the only company profile. At least one profile must exist.');
      }

      await db.init();
      if (db.deleteCompanyProfile) {
        await db.deleteCompanyProfile(companyId);
      }

      const remaining = companies.filter((c) => c.id !== companyId);
      setCompanies(remaining);

      if (activeCompanyId === companyId) {
        const nextCompany = remaining[0];
        await switchCompany(nextCompany.id);
      }
    },
    [companies, activeCompanyId, switchCompany]
  );

  const flushLocalStorage = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_CACHE_KEY);
      localStorage.removeItem(STORAGE_THEME_KEY);
      localStorage.removeItem(STORAGE_THEME_SELECTED_KEY);
      localStorage.removeItem(STORAGE_CUSTOM_QUERY_KEY);
      localStorage.removeItem(STORAGE_CUSTOM_THEME_CONFIG_KEY);
      localStorage.removeItem(STORAGE_IS_LLM_VERIFIED_KEY);
      localStorage.removeItem(STORAGE_ACTIVE_COMPANY_KEY);
      localStorage.removeItem('quark_api_key');
    }
    setConfig(DEFAULT_CONFIG);
    setCurrentThemeState(DEFAULT_THEME);
    setCustomUniverseQueryState('');
    setCustomThemeConfig(null);
    setHasSelectedTheme(false);
    setIsLlmVerifiedState(false);
    setCompanies([]);
    setActiveCompanyId(null);
    setActiveCompany(null);
  }, []);

  const exportVaultData = useCallback(async (): Promise<string> => {
    await db.init();
    const [agents, projects, tasks, documents, companyProfiles] = await Promise.all([
      db.getAgents(),
      db.getProjects(),
      db.getTasks(),
      db.getAllDocuments ? db.getAllDocuments() : [],
      db.getCompanyProfiles ? db.getCompanyProfiles() : [],
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
      currentTheme,
      activeCompanyId,
      companies: companyProfiles,
      customUniverseQuery,
      customThemeConfig,
      agents,
      projects,
      tasks,
      documents,
    };

    return JSON.stringify(exportPayload, null, 2);
  }, [currentTheme, activeCompanyId, customUniverseQuery, customThemeConfig]);

  const isConfigured = Boolean(config.apiKey && config.apiKey.trim().length > 0);
  const isLlmConfigured = isConfigured;
  const themeConfig =
    currentTheme === 'custom' && customThemeConfig
      ? customThemeConfig
      : THEMES[currentTheme] || THEMES[DEFAULT_THEME];

  return (
    <SettingsContext.Provider
      value={{
        config,
        updateConfig,
        isConfigured,
        isLoading,
        testConnection,
        flushLocalStorage,
        exportVaultData,
        currentTheme,
        themeConfig,
        hasSelectedTheme,
        setTheme,
        dismissThemeModal,
        openThemeModal,
        llmApiKey: config.apiKey,
        customUniverseQuery,
        isLlmConfigured,
        setLlmApiKey,
        setCustomUniverseQuery,
        setCustomThemeConfig: setCustomThemeConfigAction,
        themeVersion,
        // Phase 0: LLM Gate
        isLlmVerified,
        setIsLlmVerified,
        isLlmModalOpen,
        openLlmModal,
        closeLlmModal,
        // Phase 1 & 2: Company Profiles
        companies,
        activeCompany,
        activeCompanyId,
        switchCompany,
        createCompany,
        updateCompany,
        deleteCompany,
        refreshCompanies,
        isCompanyModalOpen,
        openCompanyModal,
        closeCompanyModal,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
export { THEMES, DEFAULT_THEME };
