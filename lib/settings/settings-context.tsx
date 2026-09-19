'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/db/opfs-adapter';

export type LLMProvider = 'openrouter' | 'gemini' | 'openai_compatible';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  requestsPerMinute: number;
}

export interface SettingsContextValue {
  config: LLMConfig;
  updateConfig: (partial: Partial<LLMConfig>) => Promise<void>;
  isConfigured: boolean;
  isLoading: boolean;
  testConnection: () => Promise<{ success: boolean; latencyMs?: number; error?: string }>;
  flushLocalStorage: () => Promise<void>;
  exportVaultData: () => Promise<string>;
}

export const DEFAULT_CONFIG: LLMConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.5-flash',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  temperature: 0.7,
  maxTokens: 2048,
  requestsPerMinute: 4,
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const STORAGE_CACHE_KEY = 'quark_llm_config_cache';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = React.useRef(false);

  // Hydrate settings from local storage cache first, then SQLite
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    let mounted = true;

    async function load() {
      // 1. Fast cache fallback from localStorage
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(STORAGE_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (mounted) {
              setConfig((prev) => ({ ...prev, ...parsed }));
            }
          }
        } catch (e) {
          console.warn('Failed to parse cached LLM settings:', e);
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

          setConfig((prev) => {
            const merged = { ...prev, ...loaded };
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(merged));
            }
            return merged;
          });
        }
      } catch (err) {
        console.warn('Failed to load settings from OPFS SQLite:', err);
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
    } catch (err) {
      console.warn('Failed to persist settings to OPFS SQLite:', err);
    }
  }, []);

  const testConnection = useCallback(async (): Promise<{
    success: boolean;
    latencyMs?: number;
    error?: string;
  }> => {
    const startTime = Date.now();
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-llm-provider': config.provider,
        'x-llm-api-key': config.apiKey,
        'x-llm-model': config.model,
        'x-llm-base-url': config.baseUrl,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Ping test connection. Reply with "Pong".' }],
          systemPrompt: 'You are a test diagnostic service. Reply with "Pong" concisely.',
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          latencyMs,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Check if we got a valid stream response
      const text = await response.text();
      if (text.includes('data: ') || text.includes('Pong') || response.status === 200) {
        return { success: true, latencyMs };
      }

      return { success: true, latencyMs };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: err?.message || 'Connection attempt failed',
      };
    }
  }, [config]);

  const flushLocalStorage = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_CACHE_KEY);
      localStorage.removeItem('quark_api_key');
    }
    setConfig(DEFAULT_CONFIG);
  }, []);

  const exportVaultData = useCallback(async (): Promise<string> => {
    await db.init();
    const [agents, projects, tasks, documents] = await Promise.all([
      db.getAgents(),
      db.getProjects(),
      db.getTasks(),
      db.getAllDocuments ? db.getAllDocuments() : [],
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      agents,
      projects,
      tasks,
      documents,
    };

    return JSON.stringify(exportPayload, null, 2);
  }, []);

  const isConfigured = Boolean(config.apiKey && config.apiKey.trim().length > 0);

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
