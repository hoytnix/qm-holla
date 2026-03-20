import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface StructuredField {
  id: string;
  field_key: string;
  label: string;
  ui_type: 'text' | 'textarea' | 'number' | 'toggle' | 'file' | 'select';
  options?: string[]; // JSON array of strings
  placeholders?: string[];
  order_index: number;
}

export function useStructuredFields(agentId: string | undefined) {
  const [fields, setFields] = useState<StructuredField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    async function fetchFields() {
      try {
        const { data, error } = await supabase
          .from('structured_fields')
          .select('*')
          .eq('agent_id', agentId)
          .order('order_index', { ascending: true });

        if (error) throw error;

        console.log('Fetched fields:', data);
        setFields(data || []);
      } catch (err: any) {
        console.error('Error fetching structured fields:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchFields();
  }, [agentId]);

  return { fields, loading, error };
}
