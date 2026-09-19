'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles, FolderGit2, BookOpen, Layers, Zap } from 'lucide-react';
import { AgentRecord } from '@/lib/db/adapter';
import { DEFAULT_STRAW_HAT_AGENTS, DEFAULT_PROJECT_NODES } from '@/lib/crew/default-crew';

export { DEFAULT_STRAW_HAT_AGENTS, DEFAULT_PROJECT_NODES };

interface RadialGraphProps {
  agents: AgentRecord[];
  onSelectAgent: (agent: AgentRecord) => void;
  selectedAgentId?: string | null;
}

export const RadialGraph: React.FC<RadialGraphProps> = ({
  agents,
  onSelectAgent,
  selectedAgentId,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // When agents is empty, render the fallback Straw Hat crew hierarchy so canvas is immediately interactive
  const effectiveAgents = agents.length > 0 ? agents : DEFAULT_STRAW_HAT_AGENTS;

  // Captain is the center node
  const captain = effectiveAgents.find((a) => !a.parent_agent_id) || effectiveAgents[0];
  const specialistCrew = effectiveAgents.filter((a) => a.id !== captain?.id);

  // Layout parameters
  const center = { x: 300, y: 300 };
  const innerRadius = 140;
  const outerRadius = 220;

  return (
    <div className="relative w-full max-w-[650px] aspect-square mx-auto flex items-center justify-center select-none overflow-visible">
      {/* Decorative concentric rings */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 600">
        <defs>
          <radialGradient id="oceanGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Ambient background bloom */}
        <circle cx="300" cy="300" r="280" fill="url(#oceanGlow)" />

        {/* Outer Orbit Ring */}
        <circle
          cx="300"
          cy="300"
          r={outerRadius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />

        {/* Inner Division Ring */}
        <circle
          cx="300"
          cy="300"
          r={innerRadius}
          fill="none"
          stroke="rgba(99, 102, 241, 0.25)"
          strokeWidth="1.5"
        />

        {/* Orbit Crosshairs */}
        <line x1="300" y1="50" x2="300" y2="550" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="50" y1="300" x2="550" y2="300" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* Ray connections from captain to specialist agents */}
        {specialistCrew.map((agent, i) => {
          const angle = (i * 2 * Math.PI) / specialistCrew.length - Math.PI / 2;
          const x = center.x + innerRadius * Math.cos(angle);
          const y = center.y + innerRadius * Math.sin(angle);
          const isSelected = selectedAgentId === agent.id;

          return (
            <g key={`ray-${agent.id}`}>
              <line
                x1={center.x}
                y1={center.y}
                x2={x}
                y2={y}
                stroke={isSelected ? '#818cf8' : 'rgba(255, 255, 255, 0.15)'}
                strokeWidth={isSelected ? '2' : '1'}
                strokeDasharray={isSelected ? undefined : '4 4'}
              />
              {/* Outer satellite connector */}
              <line
                x1={x}
                y1={y}
                x2={center.x + outerRadius * Math.cos(angle)}
                y2={center.y + outerRadius * Math.sin(angle)}
                stroke="rgba(56, 189, 248, 0.2)"
                strokeWidth="1"
              />
            </g>
          );
        })}
      </svg>

      {/* Center Captain Luffy Orchestrator Node */}
      {captain && (
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectAgent(captain)}
          className={`absolute z-20 flex flex-col items-center justify-center w-28 h-28 rounded-full cursor-pointer transition-all duration-300 backdrop-blur-xl border ${
            selectedAgentId === captain.id
              ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_35px_rgba(251,191,36,0.35)]'
              : 'border-indigo-500/40 bg-slate-900/80 shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:border-indigo-400'
          }`}
          style={{ top: 'calc(50% - 56px)', left: 'calc(50% - 56px)' }}
        >
          <span className="text-3xl mb-1">{captain.avatar_url || '🏴‍☠️'}</span>
          <span className="text-[11px] font-bold text-white tracking-wider uppercase text-center px-2 line-clamp-1">
            {captain.name.split(' ')[0]}
          </span>
          <span className="text-[9px] text-indigo-300/80 font-medium">Captain Helm</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center animate-pulse" />
        </motion.div>
      )}

      {/* Specialized Inner Ring Officers */}
      {specialistCrew.map((agent, i) => {
        const total = specialistCrew.length;
        const angle = (i * 2 * Math.PI) / total - Math.PI / 2;
        const x = center.x + innerRadius * Math.cos(angle);
        const y = center.y + innerRadius * Math.sin(angle);
        const isSelected = selectedAgentId === agent.id;

        // Outer satellite knowledge diamond coordinates
        const satX = center.x + outerRadius * Math.cos(angle);
        const satY = center.y + outerRadius * Math.sin(angle);

        return (
          <React.Fragment key={agent.id}>
            {/* Officer Node */}
            <motion.div
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelectAgent(agent)}
              onMouseEnter={() => setHoveredNode(agent.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className={`absolute z-20 flex flex-col items-center justify-center w-20 h-20 rounded-2xl cursor-pointer transition-all duration-200 backdrop-blur-md border ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-950/50 shadow-[0_0_25px_rgba(34,211,238,0.4)]'
                  : 'border-white/15 bg-slate-900/80 hover:border-white/40 hover:bg-slate-800/90 shadow-md'
              }`}
              style={{
                left: `${(x / 600) * 100}%`,
                top: `${(y / 600) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="text-2xl">{agent.avatar_url || '⚡'}</span>
              <span className="text-[10px] font-semibold text-white/90 truncate max-w-[68px] text-center mt-0.5">
                {agent.name.split(' ')[0]}
              </span>
              <span className="text-[8px] text-cyan-300/70 truncate max-w-[65px]">
                {agent.role_title.split(' ')[0]}
              </span>
            </motion.div>

            {/* Satellite Knowledge Diamond Node */}
            <motion.div
              whileHover={{ scale: 1.2, rotate: 45 }}
              animate={{ rotate: 45 }}
              className="absolute z-10 w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500/30 to-sky-500/30 border border-sky-400/40 backdrop-blur-sm flex items-center justify-center shadow-sm cursor-pointer"
              title={`Vault Lore Node for ${agent.name}`}
              style={{
                left: `${(satX / 600) * 100}%`,
                top: `${(satY / 600) * 100}%`,
                transform: 'translate(-50%, -50%) rotate(45deg)',
              }}
              onClick={() => onSelectAgent(agent)}
            >
              <span className="-rotate-45 text-[9px] text-sky-200">◆</span>
            </motion.div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
