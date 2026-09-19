import React from 'react';
import {
  Compass,
  Crown,
  BookOpen,
  Cpu,
  Coins,
  Activity,
  Flame,
  Target,
  Sparkles,
  Bot,
  Layers,
  LucideProps,
} from 'lucide-react';

interface AgentIconProps extends LucideProps {
  agentId?: string;
  role?: string;
  avatar?: string | null;
  className?: string;
}

export const AgentIcon: React.FC<AgentIconProps> = ({
  agentId,
  role,
  avatar,
  width = 20,
  height = 20,
  className = '',
  ...props
}) => {
  const id = (agentId || '').toLowerCase();
  const r = (role || '').toLowerCase();

  // Explicit mapping based on agent ID or role title
  if (id.includes('luffy') || id.includes('captain') || r.includes('captain') || r.includes('ceo')) {
    return <Crown width={width} height={height} className={className} {...props} />;
  }
  if (id.includes('robin') || r.includes('research') || r.includes('archaeolog')) {
    return <BookOpen width={width} height={height} className={className} {...props} />;
  }
  if (id.includes('franky') || r.includes('systems') || r.includes('shipwright') || r.includes('dev')) {
    return <Cpu width={width} height={height} className={className} {...props} />;
  }
  if (id.includes('nami') || r.includes('finance') || r.includes('navigat')) {
    return <Coins width={width} height={height} className={className} {...props} />;
  }
  if (id.includes('chopper') || r.includes('health') || r.includes('doctor') || r.includes('habits')) {
    return <Activity width={width} height={height} className={className} {...props} />;
  }
  if (id.includes('sanji') || r.includes('operations') || r.includes('cook') || r.includes('sales')) {
    return <Flame width={width} height={height} className={className} {...props} />;
  }
  if (id.includes('usopp') || r.includes('marketing') || r.includes('sniper') || r.includes('content')) {
    return <Target width={width} height={height} className={className} {...props} />;
  }

  // Fallback icon
  return <Bot width={width} height={height} className={className} {...props} />;
};
