import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { supabase } from '@/lib/supabase';

interface ModelConfigTabProps {
  agent: any;
  updateAgent: (updates: any) => void;
}

export default function ModelConfigTab({ agent, updateAgent }: ModelConfigTabProps) {
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    const { data } = await supabase.from('model_prices').select('*');
    setAvailableModels(data || []);
    setLoading(false);
  };

  const toggleModel = (modelString: string) => {
    const current = agent.allowed_models || [];
    const updated = current.includes(modelString)
      ? current.filter((m: string) => m !== modelString)
      : [...current, modelString];
    
    // If we are removing the default model, clear the default model
    let newDefaultModel = agent.default_model;
    if (current.includes(modelString) && agent.default_model === modelString) {
      newDefaultModel = null;
    }

    updateAgent({ allowed_models: updated, default_model: newDefaultModel });
  };

  const setAsDefault = (e: React.MouseEvent, modelString: string) => {
    e.stopPropagation();
    updateAgent({ default_model: modelString });
  };

  return (
    <div className="space-y-8">
      {/* Allowed Models */}
      <section className="space-y-4">
        <h3 className="text-xl text-white font-light">Allowed Models</h3>
        <p className="text-white/40 text-sm">Select which models this agent is permitted to use, and optionally set a default.</p>
        
        {loading ? (
            <div className="text-white/50">Loading models...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableModels.map((model) => {
                    const isAllowed = (agent.allowed_models || []).includes(model.model_string);
                    const isDefault = agent.default_model === model.model_string;

                    return (
                      <div 
                          key={model.id}
                          onClick={() => toggleModel(model.model_string)}
                          className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between ${
                              isAllowed
                                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-100'
                                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                          }`}
                      >
                          <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border ${
                                  isAllowed
                                      ? 'bg-emerald-500 border-emerald-500'
                                      : 'border-white/30'
                              }`} />
                              <span className="font-mono text-sm">{model.display_name || model.model_string}</span>
                          </div>
                          {isAllowed && (
                            <button
                              onClick={(e) => setAsDefault(e, model.model_string)}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                isDefault 
                                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                                  : 'bg-transparent border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                            >
                              {isDefault ? 'Default' : 'Set Default'}
                            </button>
                          )}
                      </div>
                    );
                })}
            </div>
        )}
      </section>
    </div>
  );
}
