import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface BrandingConfig {
  primary_color: string;
  primary_font_color?: string;
  font_family: string;
  background_image?: string;
  background_color?: string;
  cover_photo?: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  branding_config: BrandingConfig;
  allowed_models: string[];
  default_model?: string;
  system_prompt_template?: string;
}

export function useBranding(agentId: string | undefined) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    async function fetchAgent() {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, description, branding_config, allowed_models, default_model, system_prompt_template')
          .eq('id', agentId)
          .single();

        if (error) throw error;

        setAgent(data);
        applyBranding(data.branding_config);
      } catch (err: any) {
        console.error('Error fetching agent branding:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAgent();
  }, [agentId]);

  const applyBranding = (config: BrandingConfig) => {
    const root = document.documentElement;
    
    // Reset branding first
    root.style.removeProperty('--user-primary');
    root.style.removeProperty('--user-font');
    root.style.removeProperty('--user-font-color');
    
    // Remove dynamic font link if exists
    const existingLink = document.getElementById('dynamic-font-link');
    if (existingLink) {
      existingLink.remove();
    }

    document.body.style.backgroundImage = '';
    document.body.style.backgroundColor = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';
    document.body.style.color = '';

    if (config.primary_color) {
      root.style.setProperty('--user-primary', config.primary_color);
    }
    
    if (config.primary_font_color) {
      root.style.setProperty('--user-font-color', config.primary_font_color);
      document.body.style.color = config.primary_font_color;
    }
    
    if (config.font_family) {
      root.style.setProperty('--user-font', config.font_family);
      
      // Load font if it's a Google Font
      const fontName = config.font_family.replace(/\s+/g, '+');
      const link = document.createElement('link');
      link.id = 'dynamic-font-link';
      link.href = `https://fonts.googleapis.com/css2?family=${fontName}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    if (config.background_image) {
      document.body.style.backgroundImage = `url(${config.background_image})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else if (config.background_color) {
      document.body.style.backgroundColor = config.background_color;
    }
  };

  return { agent, loading, error };
}
