import React, { useState, useEffect } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { DragIndicator, Delete, Add } from '@mui/icons-material';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface StructuredField {
  id?: string; // Optional for new fields
  field_key: string;
  label: string;
  ui_type: 'text' | 'number' | 'toggle' | 'file' | 'select' | 'textarea';
  options?: any;
  placeholders?: string[];
  order_index: number;
}

interface SchemaBuilderProps {
  agentId: string;
}

export default function SchemaBuilder({ agentId }: SchemaBuilderProps) {
  const [fields, setFields] = useState<StructuredField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, [agentId]);

  const fetchFields = async () => {
    const { data, error } = await supabase
      .from('structured_fields')
      .select('*')
      .eq('agent_id', agentId)
      .order('order_index', { ascending: true });

    if (error) console.error('Error fetching fields:', error);
    else setFields(data || []);
    setLoading(false);
  };

  const addField = () => {
    const newField: StructuredField = {
      // Temporary ID for key
      id: `temp-${uuidv4()}`,
      field_key: '',
      label: '',
      ui_type: 'text',
      order_index: fields.length,
    };
    setFields([...fields, newField]);
  };

  const removeField = async (index: number, id?: string) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);

    if (id && !id.startsWith('temp-')) {
      await supabase.from('structured_fields').delete().eq('id', id);
    }
  };

  const updateField = (index: number, key: keyof StructuredField, value: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const saveSchema = async () => {
    setLoading(true);
    
    const newFields = fields.filter(f => !f.id || f.id.startsWith('temp-'));
    const existingFields = fields.filter(f => f.id && !f.id.startsWith('temp-'));

    // 1. Insert new fields
    if (newFields.length > 0) {
      const insertData = newFields.map((field, index) => ({
        id: uuidv4(),
        agent_id: agentId,
        field_key: field.field_key,
        label: field.label,
        ui_type: field.ui_type,
        options: field.options,
        placeholders: field.placeholders || [],
        order_index: fields.findIndex(f => f === field),
      }));
      const { error } = await supabase.from('structured_fields').insert(insertData);
      if (error) {
        console.error('Error inserting fields:', error);
        alert('Failed to insert fields: ' + error.message);
        setLoading(false);
        return;
      }
    }

    // 2. Update existing fields
    if (existingFields.length > 0) {
      const updateData = existingFields.map((field, index) => ({
        id: field.id,
        agent_id: agentId,
        field_key: field.field_key,
        label: field.label,
        ui_type: field.ui_type,
        options: field.options,
        placeholders: field.placeholders || [],
        order_index: fields.findIndex(f => f === field),
      }));
      const { error } = await supabase.from('structured_fields').upsert(updateData);
      if (error) {
        console.error('Error updating fields:', error);
        alert('Failed to update fields: ' + error.message);
        setLoading(false);
        return;
      }
    }

    alert('Schema saved successfully');
    fetchFields(); // Refresh to get real IDs
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl text-white font-light">Forms</h3>
        <GlassButton onClick={saveSchema} disabled={loading}>
          {loading ? 'Saving...' : 'Save Schema'}
        </GlassButton>
      </div>

      <Reorder.Group axis="y" values={fields} onReorder={setFields} className="space-y-4">
        {fields.map((field, index) => (
          <Reorder.Item key={field.id || index} value={field}>
            <GlassCard className="p-4 flex items-center gap-4 bg-white/5">
              <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white">
                <DragIndicator />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                <GlassInput
                  placeholder="Field Key (e.g. user_name)"
                  value={field.field_key}
                  onChange={(e) => updateField(index, 'field_key', e.target.value)}
                  className="bg-black/40"
                />
                <GlassInput
                  placeholder="Label (e.g. Full Name)"
                  value={field.label}
                  onChange={(e) => updateField(index, 'label', e.target.value)}
                  className="bg-black/40"
                />
                <select
                  value={field.ui_type}
                  onChange={(e) => updateField(index, 'ui_type', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-white focus:outline-none focus:border-white/30"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Text Area</option>
                  <option value="number">Number</option>
                  <option value="toggle">Toggle</option>
                  <option value="file">File</option>
                  <option value="select">Select</option>
                </select>

                {field.ui_type === 'select' && (
                  <GlassInput
                    placeholder="Options (comma separated)"
                    value={Array.isArray(field.options) ? field.options.join(', ') : field.options || ''}
                    onChange={(e) => updateField(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                    className="bg-black/40 md:col-span-3"
                  />
                )}
                
                <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider ml-1">Placeholders (0-3)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((i) => (
                            <GlassInput
                                key={i}
                                placeholder={`Placeholder ${i + 1}`}
                                value={field.placeholders?.[i] || ''}
                                onChange={(e) => {
                                    const newPlaceholders = [...(field.placeholders || [])];
                                    newPlaceholders[i] = e.target.value;
                                    updateField(index, 'placeholders', newPlaceholders.filter(p => p !== ''));
                                }}
                                className="bg-black/40"
                            />
                        ))}
                    </div>
                </div>
              </div>

              <button
                onClick={() => removeField(index, field.id)}
                className="p-2 text-red-400/50 hover:text-red-400 transition-colors"
              >
                <Delete />
              </button>
            </GlassCard>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <GlassButton onClick={addField} variant="secondary" className="w-full py-4 border-dashed border-white/20">
        <Add className="mr-2" /> Add Field
      </GlassButton>
    </div>
  );
}
