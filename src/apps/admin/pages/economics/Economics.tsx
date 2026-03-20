import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { supabase } from '@/lib/supabase';
import { 
  Add, 
  Delete, 
  Edit, 
  Save, 
  Cancel,
  SmartToy
} from '@mui/icons-material';

interface ModelPrice {
  id: string;
  model_string: string;
  display_name: string;
  fixed_cost: number;
}

export default function Economics() {
  // Model Pricing State
  const [models, setModels] = useState<ModelPrice[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ cost: number, displayName: string }>({ cost: 0, displayName: '' });
  const [newModel, setNewModel] = useState({ model_string: '', display_name: '', fixed_cost: 0 });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchModelPrices();
  }, []);

  const fetchModelPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('model_prices')
        .select('*')
        .order('model_string', { ascending: true });
      
      if (error) throw error;
      if (data) setModels(data);
    } catch (error) {
      console.error('Error fetching model prices:', error);
    } finally {
      setModelsLoading(false);
    }
  };

  const handleAddModel = async () => {
    if (!newModel.model_string) return;
    try {
      const { data, error } = await supabase
        .from('model_prices')
        .insert([{ 
          model_string: newModel.model_string,
          display_name: newModel.display_name,
          fixed_cost: newModel.fixed_cost 
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setModels([...models, data]);
        setNewModel({ model_string: '', display_name: '', fixed_cost: 0 });
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Error adding model:', error);
      alert('Failed to add model. Ensure the model string is unique.');
    }
  };

  const handleDeleteModel = async (id: string) => {
    console.log('handleDeleteModel called for:', id);
    // if (!confirm('Are you sure you want to remove this model from the whitelist?')) return;
    console.log('Proceeding with deletion for:', id);
    try {
      console.log('Supabase delete call starting...');
      const { error } = await supabase
        .from('model_prices')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      console.log('Supabase delete call successful');
      setModels(models.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting model:', error);
      alert('Failed to delete model: ' + (error as Error).message);
    }
  };

  const startEditing = (model: ModelPrice) => {
    setEditingId(model.id);
    setEditForm({ cost: model.fixed_cost, displayName: model.display_name || '' });
  };

  const saveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('model_prices')
        .update({ fixed_cost: editForm.cost, display_name: editForm.displayName })
        .eq('id', id);

      if (error) throw error;
      
      setModels(models.map(m => m.id === id ? { ...m, fixed_cost: editForm.cost, display_name: editForm.displayName } : m));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating model:', error);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-white uppercase">
            Economics
          </h1>
          <p className="text-white/40 mt-2 font-light">
            Manage global pricing and model settings.
          </p>
        </div>
      </div>

      {/* Model Pricing Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-light text-white/80 uppercase tracking-wide flex items-center gap-2">
            <SmartToy className="text-indigo-400" />
            Model Whitelist & Pricing
          </h2>
          <GlassButton 
            onClick={() => setIsAdding(!isAdding)}
            variant={isAdding ? "secondary" : "primary"}
            size="sm"
          >
            {isAdding ? <Cancel className="mr-2 text-xs" /> : <Add className="mr-2 text-xs" />}
            {isAdding ? 'Cancel' : 'Add Model'}
          </GlassButton>
        </div>

        {isAdding && (
          <GlassCard className="p-6 border-indigo-500/30 bg-indigo-500/5 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-medium text-indigo-300 uppercase tracking-wider mb-4">New Model Configuration</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <GlassInput
                  label="Model ID (OpenRouter String)"
                  placeholder="e.g. anthropic/claude-3-opus"
                  value={newModel.model_string}
                  onChange={(e) => setNewModel({ ...newModel, model_string: e.target.value })}
                />
              </div>
              <div className="flex-1 w-full">
                <GlassInput
                  label="Display Name"
                  placeholder="e.g. Claude 3 Opus"
                  value={newModel.display_name}
                  onChange={(e) => setNewModel({ ...newModel, display_name: e.target.value })}
                />
              </div>
              <div className="w-full md:w-48">
                <GlassInput
                  label="Cost per Request (Credits)"
                  type="number"
                  min="0"
                  value={newModel.fixed_cost}
                  onChange={(e) => setNewModel({ ...newModel, fixed_cost: parseInt(e.target.value) || 0 })}
                />
              </div>
              <GlassButton onClick={handleAddModel} disabled={!newModel.model_string}>
                Confirm Addition
              </GlassButton>
            </div>
          </GlassCard>
        )}

        <GlassCard className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/50 uppercase text-xs tracking-wider">
              <tr>
                <th className="p-4 font-medium">Model Identifier</th>
                <th className="p-4 font-medium">Display Name</th>
                <th className="p-4 font-medium text-right">Cost (Credits)</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {modelsLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/30">Loading registry...</td>
                </tr>
              ) : models.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/30">No models whitelisted. Add one to begin.</td>
                </tr>
              ) : (
                models.map((model) => (
                  <tr key={model.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-white font-mono">
                      {model.model_string}
                    </td>
                    <td className="p-4 text-white">
                      {editingId === model.id ? (
                        <input
                          type="text"
                          className="bg-black/40 border border-white/20 rounded px-2 py-1 w-full text-white focus:outline-none focus:border-emerald-500"
                          value={editForm.displayName}
                          onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                        />
                      ) : (
                        <span>{model.display_name || model.model_string}</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-400">
                      {editingId === model.id ? (
                        <input
                          type="number"
                          className="bg-black/40 border border-white/20 rounded px-2 py-1 text-right w-24 text-white focus:outline-none focus:border-emerald-500"
                          value={editForm.cost}
                          onChange={(e) => setEditForm({ ...editForm, cost: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        <span>{model.fixed_cost}</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {editingId === model.id ? (
                        <>
                          <button 
                            onClick={() => saveEdit(model.id)}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="Save"
                          >
                            <Save fontSize="small" />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="text-white/40 hover:text-white/60 transition-colors"
                            title="Cancel"
                          >
                            <Cancel fontSize="small" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEditing(model)}
                            className="text-white/40 hover:text-white/80 transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit Cost"
                          >
                            <Edit fontSize="small" />
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Delete button clicked for model:', model.id);
                              handleDeleteModel(model.id);
                            }}
                            className="text-red-400/50 hover:text-red-400 transition-colors"
                            title="Remove from Whitelist"
                          >
                            <Delete fontSize="small" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>
    </div>
  );
}
