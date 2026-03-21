import React, { useEffect, useState } from 'react';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { supabase } from '@/lib/supabase';
import { Save } from 'lucide-react';

interface BrandingTabProps {
  agent: any;
  updateAgent: (updates: any) => void;
}

export default function BrandingTab({ agent, updateAgent }: BrandingTabProps) {
  const [localAgent, setLocalAgent] = useState(agent);

  useEffect(() => {
    setLocalAgent(agent);
  }, [agent]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (JSON.stringify(localAgent) !== JSON.stringify(agent)) {
        updateAgent({ 
            description: localAgent.description,
            branding_config: localAgent.branding_config 
        });
      }
    }, 15000);

    return () => clearTimeout(handler);
  }, [localAgent, agent, updateAgent]);

  const config = localAgent.branding_config || {};

  const updateConfig = (key: string, value: string) => {
    setLocalAgent({
      ...localAgent,
      branding_config: {
        ...config,
        [key]: value
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error('User not authenticated');
      return;
    }

    // Use kb_attachments bucket since it has working RLS policies
    const filePath = `${userData.user.id}/agent_assets/${agent.id}/${key}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
        .from('kb_attachments')
        .upload(filePath, file, { upsert: true, contentType: file.type });

    if (error) {
        console.error('Upload error details:', error);
        return;
    }

    const { data } = supabase.storage
        .from('kb_attachments')
        .getPublicUrl(filePath);

    updateConfig(key, data.publicUrl);
    // Force immediate save for file uploads
    updateAgent({ 
        description: localAgent.description,
        branding_config: {
            ...config,
            [key]: data.publicUrl
        }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl text-white font-light">Branding Configuration</h3>
        <GlassButton
            onClick={() => updateAgent({ 
                description: localAgent.description,
                branding_config: localAgent.branding_config 
            })}
            title="Save Changes"
        >
            <Save size={16} />
        </GlassButton>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
            <GlassInput
                label="App Description"
                placeholder="A brief description of this agent..."
                value={localAgent.description || ''}
                onChange={(e) => setLocalAgent({ ...localAgent, description: e.target.value })}
            />
        </div>

        <GlassInput
            label="Primary Color (Hex)"
            placeholder="#3B82F6"
            value={config.primary_color || ''}
            onChange={(e) => updateConfig('primary_color', e.target.value)}
        />
        
        <GlassInput
            label="Font Family (Google Fonts Name)"
            placeholder="Inter"
            value={config.font_family || ''}
            onChange={(e) => updateConfig('font_family', e.target.value)}
        />
        {config.font_family && (
            <div className="p-4 rounded-xl border border-white/10 bg-black/20" style={{ fontFamily: config.font_family }}>
                <p className="text-white">Preview: {config.font_family}</p>
                <p className="text-white/70">The quick brown fox jumps over the lazy dog.</p>
            </div>
        )}

        <div className="md:col-span-2 space-y-4">
            <GlassInput
                label="Background Color (Hex)"
                placeholder="#000000"
                value={config.background_color || ''}
                onChange={(e) => updateConfig('background_color', e.target.value)}
            />
            <div className="space-y-1">
                <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">Background Image URL</label>
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        type="text"
                        placeholder="https://..."
                        value={config.background_image || ''}
                        onChange={(e) => updateConfig('background_image', e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 backdrop-blur-sm transition-all"
                    />
                    <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, 'background_image')}
                        className="text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                    />
                </div>
            </div>
            {config.background_image && (
                <div className="h-48 w-full rounded-xl border border-white/10 overflow-hidden relative">
                    <img 
                        src={config.background_image} 
                        alt="Preview" 
                        className="w-full h-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white/80 font-light tracking-widest uppercase">
                        Preview
                    </div>
                </div>
            )}
        </div>

        <div className="md:col-span-2 space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">App Icon URL</label>
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        type="text"
                        placeholder="https://..."
                        value={config.app_icon || ''}
                        onChange={(e) => updateConfig('app_icon', e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 backdrop-blur-sm transition-all"
                    />
                    <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, 'app_icon')}
                        className="text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                    />
                </div>
            </div>
            {config.app_icon && (
                <div className="h-24 w-24 rounded-xl border border-white/10 overflow-hidden relative">
                    <img 
                        src={config.app_icon} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
        </div>

        <div className="md:col-span-2 space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">Cover Photo URL</label>
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        type="text"
                        placeholder="https://..."
                        value={config.cover_photo || ''}
                        onChange={(e) => updateConfig('cover_photo', e.target.value)}
                        className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 backdrop-blur-sm transition-all"
                    />
                    <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, 'cover_photo')}
                        className="text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                    />
                </div>
            </div>
            {config.cover_photo && (
                <div className="h-48 w-full rounded-xl border border-white/10 overflow-hidden relative">
                    <img 
                        src={config.cover_photo} 
                        alt="Preview" 
                        className="w-full h-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white/80 font-light tracking-widest uppercase">
                        Preview
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
