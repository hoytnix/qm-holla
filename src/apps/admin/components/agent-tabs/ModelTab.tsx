import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';

const AVAILABLE_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
  'gemini-pro-vision'
];

export default function ModelTab({ agent, updateAgent }: { agent: any, updateAgent: (updates: any) => void }) {
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt_template || '');
  const [suggestions, setSuggestions] = useState((agent.initial_suggestions || []).join('\n'));

  const toggleModel = (model: string) => {
    const currentModels = agent.allowed_models || [];
    const newModels = currentModels.includes(model)
      ? currentModels.filter((m: string) => m !== model)
      : [...currentModels, model];
    updateAgent({ allowed_models: newModels });
  };

  const handleSystemPromptBlur = () => {
    updateAgent({ system_prompt_template: systemPrompt });
  };

  const handleSuggestionsBlur = () => {
      // Split by newline and filter empty
      const newSuggestions = suggestions.split('\n').filter((s: string) => s.trim());
      updateAgent({ initial_suggestions: newSuggestions });
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-light mb-4">Model Configuration</h3>
        
        <div className="mb-8">
            <label className="block text-xs font-medium text-white/70 uppercase tracking-wider mb-3">Allowed Models</label>
            <div className="grid grid-cols-2 gap-4">
                {AVAILABLE_MODELS.map(model => (
                    <label key={model} className="flex items-center space-x-3 p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                        <input 
                            type="checkbox" 
                            checked={(agent.allowed_models || []).includes(model)}
                            onChange={() => toggleModel(model)}
                            className="rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-indigo-500/50"
                        />
                        <span className="text-sm font-mono">{model}</span>
                    </label>
                ))}
            </div>
        </div>

        <div className="mb-8">
             <label className="block text-xs font-medium text-white/70 uppercase tracking-wider mb-3">System Prompt Template</label>
             <textarea
                className="w-full h-48 rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 backdrop-blur-sm transition-all font-mono text-sm"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                onBlur={handleSystemPromptBlur}
                placeholder="You are a helpful assistant..."
            />
            <p className="text-xs text-white/40 mt-2">Use {'{{variable}}'} for dynamic inputs.</p>
        </div>

        <div>
            <label className="block text-xs font-medium text-white/70 uppercase tracking-wider mb-3">Initial Suggestions (One per line)</label>
            <textarea
                className="w-full h-32 rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 backdrop-blur-sm transition-all font-sans text-sm"
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                onBlur={handleSuggestionsBlur}
                placeholder="Tell me a joke&#10;Write a poem&#10;Analyze this data"
            />
        </div>
      </GlassCard>
    </div>
  );
}
