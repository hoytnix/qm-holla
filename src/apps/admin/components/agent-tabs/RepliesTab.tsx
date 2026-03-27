import React, { useEffect, useState } from 'react';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { Save } from 'lucide-react';

interface RepliesTabProps {
  agent: any;
  updateAgent: (updates: any) => void;
}

export default function RepliesTab({ agent, updateAgent }: RepliesTabProps) {
  const [localAgent, setLocalAgent] = useState(agent);

  useEffect(() => {
    setLocalAgent(agent);
  }, [agent]);

  const config = localAgent.branding_config || {};
  const suggestedReplies = config.initial_suggested_replies || ['', '', ''];

  const updateReply = (index: number, value: string) => {
    const newReplies = [...suggestedReplies];
    newReplies[index] = value;
    
    setLocalAgent({
      ...localAgent,
      branding_config: {
        ...config,
        initial_suggested_replies: newReplies
      }
    });
  };

  const handleSave = () => {
    updateAgent({ 
        branding_config: localAgent.branding_config 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl text-white font-light">Suggested Replies Configuration</h3>
        <GlassButton
            onClick={handleSave}
            title="Save Changes"
        >
            <Save size={16} />
        </GlassButton>
      </div>
      
      <div className="space-y-4">
        <p className="text-white/60 text-sm">Specify the 3 suggested replies for the first response.</p>
        {suggestedReplies.map((reply: string, index: number) => (
          <GlassInput
            key={index}
            label={`Suggested Reply ${index + 1}`}
            placeholder={`Enter suggested reply ${index + 1}...`}
            value={reply}
            onChange={(e) => updateReply(index, e.target.value)}
          />
        ))}
      </div>
    </div>
  );
}
