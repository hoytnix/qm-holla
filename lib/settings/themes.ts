export type AppTheme =
  | 'one-piece'
  | 'naruto'
  | 'the-office'
  | 'game-of-thrones'
  | 'ncis'
  | 'pokemon'
  | 'frieren';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  defaultGroup: string; // e.g., Straw Hat Pirates vs. Team 7 vs. Dunder Mifflin
  tagline: string;
  leaderTitle: string; // Captain, Hokage, Regional Manager, Lord Commander / King, Special Agent in Charge, Champion, Mage
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  'one-piece': {
    id: 'one-piece',
    name: 'One Piece',
    defaultGroup: 'Straw Hat Pirates',
    tagline: 'Set sail across the Grand Line with an unstoppable pirate crew.',
    leaderTitle: 'Captain',
    accentColor: 'text-red-500',
    accentBg: 'from-red-600 to-amber-600',
    accentBorder: 'border-red-500/40',
    badgeBg: 'bg-red-500/10',
    badgeText: 'text-red-400',
    description: 'Adventure across uncharted seas with sovereign pirate autonomy and fearless ambition.',
  },
  'naruto': {
    id: 'naruto',
    name: 'Naruto',
    defaultGroup: 'Team 7',
    tagline: 'Defend the Hidden Leaf Village with master shinobi coordination.',
    leaderTitle: 'Hokage',
    accentColor: 'text-orange-500',
    accentBg: 'from-orange-600 to-amber-500',
    accentBorder: 'border-orange-500/40',
    badgeBg: 'bg-orange-500/10',
    badgeText: 'text-orange-400',
    description: 'Execute tactical missions, master chakra disciplines, and protect your squad.',
  },
  'the-office': {
    id: 'the-office',
    name: 'The Office',
    defaultGroup: 'Dunder Mifflin Scranton',
    tagline: 'Limitless paper in a paperless world, guided by Scranton branch wisdom.',
    leaderTitle: 'Regional Manager',
    accentColor: 'text-blue-600',
    accentBg: 'from-blue-600 to-sky-600',
    accentBorder: 'border-blue-500/40',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
    description: 'Navigate sales quotas, conference room meetings, and office pranks with structured chaos.',
  },
  'game-of-thrones': {
    id: 'game-of-thrones',
    name: 'Game Of Thrones',
    defaultGroup: 'Small Council',
    tagline: 'Rule the Seven Kingdoms through strategic counsel and royal decree.',
    leaderTitle: 'Hand of the King',
    accentColor: 'text-amber-600',
    accentBg: 'from-amber-600 to-red-700',
    accentBorder: 'border-amber-500/40',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    description: 'Weigh whispers from the realm, balance the treasury, and prepare for the coming winter.',
  },
  'ncis': {
    id: 'ncis',
    name: 'NCIS',
    defaultGroup: 'MCRT Response Team',
    tagline: 'Investigate complex crimes and secure high-stakes intelligence under Gibbs’ rules.',
    leaderTitle: 'Special Agent in Charge',
    accentColor: 'text-red-700',
    accentBg: 'from-red-800 to-slate-800',
    accentBorder: 'border-red-600/40',
    badgeBg: 'bg-red-700/10',
    badgeText: 'text-red-300',
    description: 'Forensics, ballistics, cyber ops, and relentless field investigations without exception.',
  },
  'pokemon': {
    id: 'pokemon',
    name: 'Pokemon',
    defaultGroup: 'Pallet Town Trainers',
    tagline: 'Catch, train, and orchestrate a championship team across the Kanto region.',
    leaderTitle: 'Pokemon Champion',
    accentColor: 'text-yellow-500',
    accentBg: 'from-yellow-500 to-amber-600',
    accentBorder: 'border-yellow-500/40',
    badgeBg: 'bg-yellow-500/10',
    badgeText: 'text-yellow-400',
    description: 'Explore wilderness routes, fill the Pokedex, and master strategic type matchups.',
  },
  'frieren': {
    id: 'frieren',
    name: 'Frieren',
    defaultGroup: 'Hero Party Successors',
    tagline: 'Journey toward Ende across the northern plateau, collecting spells along the way.',
    leaderTitle: 'First-Class Mage',
    accentColor: 'text-sky-400',
    accentBg: 'from-sky-500 to-indigo-600',
    accentBorder: 'border-sky-400/40',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-300',
    description: 'Contemplate time, unravel ancient grimoires, and cherish everyday human connections.',
  },
};

export const DEFAULT_THEME: AppTheme = 'one-piece';
