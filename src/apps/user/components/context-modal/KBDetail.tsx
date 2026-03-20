import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Close, UploadFile, EditNote, Edit, Delete } from '@mui/icons-material';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { KB } from './types';

interface KBDetailProps {
  kb: KB;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<KB>) => void;
  onDeleteAttachment: (id: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, kbId: string) => void;
  onPaste: (kbId: string) => void;
  onStartEditing: (attachment: any) => void;
  editingAttachment: any;
  editContent: any;
  setEditContent: (content: any) => void;
  saveEdit: () => void;
  setEditingAttachment: (attachment: any) => void;
  saving: boolean;
  loadingContent: boolean;
}

export const KBDetail = ({ 
    kb, onClose, onUpdate, onDeleteAttachment, onUpload, onPaste, onStartEditing,
    editingAttachment, editContent, setEditContent, saveEdit, setEditingAttachment, saving, loadingContent
}: KBDetailProps) => {
  const [name, setName] = useState(kb.name);
  
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 p-6 rounded-3xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white">Edit Knowledge Base</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white"><Close /></button>
      </div>
      
      <div className="flex gap-4 mb-6">
        <GlassInput value={name} onChange={(e) => setName(e.target.value)} placeholder="KB name..." className="flex-1" />
        <GlassButton onClick={() => onUpdate(kb.id, { name })}>Save Name</GlassButton>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold text-white">Documents</h4>
            <div className="flex gap-2">
                <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={(e) => onUpload(e, kb.id)} />
                    <span className="px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white flex items-center gap-2">
                        <UploadFile fontSize="small" /> Upload
                    </span>
                </label>
                <GlassButton onClick={() => onPaste(kb.id)} className="text-xs gap-2">
                    <EditNote fontSize="small" /> Paste
                </GlassButton>
            </div>
        </div>
        
        {kb.kb_attachments && kb.kb_attachments.length > 0 ? (
            <div className="space-y-2">
                {kb.kb_attachments.map((att: any) => (
                    <div key={att.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-sm text-white/70 font-mono">{att.file_name}</span>
                        <div className="flex items-center gap-2">
                            {(att.file_name.endsWith('.md') || att.file_name.endsWith('.txt')) && (
                                <button onClick={() => onStartEditing(att)} className="p-1 text-white/50 hover:text-white"><Edit fontSize="small" /></button>
                            )}
                            <button onClick={() => onDeleteAttachment(att.id)} className="p-1 text-red-400/50 hover:text-red-400"><Delete fontSize="small" /></button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-sm text-white/30 italic py-4">No documents uploaded yet.</div>
        )}
      </div>
    </motion.div>
  );
};
