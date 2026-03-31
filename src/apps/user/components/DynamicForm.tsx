import React, { useState, useEffect } from 'react';
import { useStructuredFields, StructuredField } from '../hooks/useStructuredFields';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DynamicFormProps {
  agentId: string;
  agentDescription?: string;
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting: boolean;
  onSelectKnowledgeBase?: () => void;
  selectedProjectName?: string;
  allowedModels?: string[];
  defaultModel?: string;
  brandingBackgroundColor?: string;
}

export function DynamicForm({ agentId, agentDescription, onSubmit, isSubmitting, onSelectKnowledgeBase, selectedProjectName, allowedModels, defaultModel, brandingBackgroundColor }: DynamicFormProps) {
  const { fields, loading, error } = useStructuredFields(agentId);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel || allowedModels?.[0] || '');
  const [isMinimized, setIsMinimized] = useState(false);

  // Fetch all models from DB to get display names and IDs
  useEffect(() => {
    async function fetchModels() {
      const { data } = await supabase.from('model_prices').select('*');
      if (data) {
        setAvailableModels(data);
      }
    }
    fetchModels();
  }, []);

  // Filter available models based on allowedModels from agent
  const validModels = availableModels.filter(m => 
    allowedModels?.includes(m.model_string)
  );

  // Initialize form data with defaults if needed
  useEffect(() => {
    if (fields.length > 0) {
      const initialData: Record<string, any> = {};
      fields.forEach(field => {
        if (field.ui_type === 'toggle') initialData[field.field_key] = false;
        else initialData[field.field_key] = '';
      });
      setFormData(initialData);
    }
  }, [fields]);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    onSubmit({ ...formData, selectedModel });
  };

  if (loading) return <div className="p-4 text-white/50 text-xs animate-pulse">Loading protocols...</div>;
  if (error) return <div className="p-4 text-red-400 text-xs">Error loading protocols: {error}</div>;

  return (
    <div className="w-full">
      <div 
        className="p-4 md:p-6 border-b border-branding/5"
        style={{ backgroundColor: brandingBackgroundColor || '#09090b' }}
      >
        <div className="max-w-4xl mx-auto">
          {agentDescription && (
            <div className="mb-8 text-center">
              <p className="text-branding/80 text-lg font-light leading-relaxed">
                {agentDescription}
              </p>
            </div>
          )}
          
          {onSelectKnowledgeBase && (
            <div className="mb-6 flex justify-center">
              <GlassButton onClick={onSelectKnowledgeBase} className="gap-2 text-white" variant="primary">
                <FolderOpen size={16} /> {selectedProjectName ? `Knowledge Base: ${selectedProjectName}` : 'Select Knowledge Base'}
              </GlassButton>
            </div>
          )}
          
          {fields.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                  <h3 className="text-[10px] font-medium text-branding/40 uppercase tracking-[0.2em]">
                    Enter Details
                  </h3>
                  {isMinimized ? <ChevronDown size={14} className="text-branding/40" /> : <ChevronUp size={14} className="text-branding/40" />}
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]" />
              </div>

              <div className="mb-6 space-y-1">
                <label className="text-[10px] text-branding/40 uppercase tracking-wider ml-1">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-zinc-900 border border-branding/10 rounded-lg p-2.5 text-xs text-zinc-400 focus:outline-none focus:border-branding/30 transition-colors appearance-none"
                >
                  {validModels.map((model) => (
                    <option key={model.model_string} value={model.model_string} className="bg-zinc-900 text-branding">
                      {model.display_name || model.model_string}
                    </option>
                  ))}
                </select>
              </div>

              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fields.map((field) => (
                        <div key={field.id} className="space-y-1">
                          {field.ui_type === 'text' || field.ui_type === 'number' || field.ui_type === 'file' ? (
                            <div className="space-y-1">
                              <GlassInput
                                label={field.label}
                                type={field.ui_type}
                                value={formData[field.field_key] || ''}
                                onChange={(e) => handleChange(field.field_key, e.target.value)}
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                className="bg-zinc-900 border-branding/10 focus:border-branding/30 transition-colors text-xs text-zinc-400"
                              />
                              {field.placeholders && field.placeholders.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {field.placeholders.map((p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => handleChange(field.field_key, p)}
                                      className="text-xs bg-branding/10 hover:bg-branding/20 text-branding px-4 py-2 rounded-lg transition-colors"
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : field.ui_type === 'textarea' ? (
                            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                              <label className="text-[10px] text-white/40 uppercase tracking-wider ml-1">
                                {field.label}
                              </label>
                              <textarea
                                value={formData[field.field_key] || ''}
                                onChange={(e) => handleChange(field.field_key, e.target.value)}
                                className="w-full bg-zinc-900 border border-branding/10 rounded-lg p-3 text-xs text-zinc-400 placeholder-branding/20 focus:outline-none focus:border-branding/30 transition-colors min-h-[60px] resize-none"
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                              />
                              {field.placeholders && field.placeholders.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {field.placeholders.map((p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => handleChange(field.field_key, p)}
                                      className="text-xs bg-branding/10 hover:bg-branding/20 text-branding px-4 py-2 rounded-lg transition-colors"
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : field.ui_type === 'select' ? (
                            <div className="space-y-1">
                              <label className="text-[10px] text-white/40 uppercase tracking-wider ml-1">
                                {field.label}
                              </label>
                              <select
                                value={formData[field.field_key] || ''}
                                onChange={(e) => handleChange(field.field_key, e.target.value)}
                                className="w-full bg-zinc-900 border border-branding/10 rounded-lg p-2.5 text-xs text-zinc-400 focus:outline-none focus:border-branding/30 transition-colors appearance-none"
                              >
                                <option value="" disabled>Select {field.label}</option>
                                {field.options?.map((opt: string) => (
                                  <option key={opt} value={opt} className="bg-zinc-900 text-white">
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : field.ui_type === 'toggle' ? (
                            <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg border border-white/10">
                              <span className="text-xs text-white/60">{field.label}</span>
                              <button
                                type="button"
                                onClick={() => handleChange(field.field_key, !formData[field.field_key])}
                                className={`w-8 h-4 rounded-full relative transition-colors ${
                                  formData[field.field_key] ? 'bg-primary' : 'bg-zinc-800'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                    formData[field.field_key] ? 'left-4.5' : 'left-0.5'
                                  }`}
                                />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          <div className="mt-6 flex justify-end">
            <GlassButton onClick={handleSubmit} disabled={isSubmitting} className="text-white">
              {isSubmitting ? 'Initializing...' : 'Start Chat'}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
}
