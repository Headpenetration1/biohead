export const Colors = {
  // Primære brand-farger (Midnight Glassmorphism)
  darkBase: '#020508',         // Deepest midnight
  darkBaseLighter: '#091016',  // Slightly lighter background
  darkBaseCard: 'rgba(255, 255, 255, 0.05)', // Glassy transparent card background
  greenAccent: '#00F0FF',      // Neon cyan accent instead of muted green
  greenAccentHover: '#33F3FF',
  greenAccentSoft: 'rgba(0, 240, 255, 0.15)',
  deepBlue: '#0070F3',         // Vibrant secondary blue
  lightBeige: '#F8FAFC',       // Crisp almost-white for primary text

  // Tekst
  textPrimary: '#F8FAFC',
  textSecondary: 'rgba(248, 250, 252, 0.65)',
  textMuted: 'rgba(248, 250, 252, 0.4)',

  // Modusfarger - Høy kontrast for glowing effekter
  calmGlow: '#00F0FF',    // Neon Cyan
  focusGlow: '#B5179E',   // Neon Pink/Purple
  energyGlow: '#FF9E00',  // Vivid Gold / Orange
  energyGold: '#FF9E00',
  sleepGlow: '#818CF8',   // Soft Indigo
  balanceGlow: '#10B981', // Vibrant Mint
  destressGlow: '#F43F5E',// Sunset Coral
  triangleGlow: '#A78BFA', // Soft violet
  slowGlow: '#38BDF8',     // Sky blue
  deepSighGlow: '#FB7185', // Rose
  stretchGlow: '#C084FC',  // Bright purple

  // System
  error: '#FF2A55',       // Vibrant error red
  success: '#00F0FF',     // Use base accent for success
} as const;
