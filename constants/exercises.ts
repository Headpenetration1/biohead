import { Colors } from './colors';

export type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'holdOut';

export interface BreathingPattern {
  phase: BreathingPhase;
  duration: number;
  label: string;
}

export interface Exercise {
  id: 'calm' | 'focus' | 'energy' | 'sleep' | 'balance' | 'destress';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  glowColor: string;
  pattern: BreathingPattern[];
  technique: string;
  defaultDuration: number;
}

export const exercises: Exercise[] = [
  {
    id: 'calm',
    title: 'Ro',
    subtitle: 'Senk skuldrene',
    description:
      'En rolig pusteøvelse som aktiverer det parasympatiske nervesystemet. Perfekt når du trenger å roe ned.',
    icon: 'Moon',
    glowColor: Colors.calmGlow,
    pattern: [
      { phase: 'inhale', duration: 4, label: 'Pust inn' },
      { phase: 'hold', duration: 7, label: 'Hold' },
      { phase: 'exhale', duration: 8, label: 'Pust ut' },
    ],
    technique: '4-7-8 teknikk',
    defaultDuration: 60,
  },
  {
    id: 'focus',
    title: 'Fokus',
    subtitle: 'Skjerp tankene',
    description:
      'Balansert pustemønster som øker mental klarhet og konsentrasjon. Ideell før arbeid eller studier.',
    icon: 'Focus',
    glowColor: Colors.focusGlow,
    pattern: [
      { phase: 'inhale', duration: 4, label: 'Pust inn' },
      { phase: 'hold', duration: 4, label: 'Hold' },
      { phase: 'exhale', duration: 4, label: 'Pust ut' },
      { phase: 'holdOut', duration: 4, label: 'Hold' },
    ],
    technique: 'Box breathing',
    defaultDuration: 60,
  },
  {
    id: 'energy',
    title: 'Energi',
    subtitle: 'Lad opp batteriene',
    description:
      'Rask, energigivende pusteteknikk som øker oksygenopptak og gir et naturlig energiløft.',
    icon: 'Zap',
    glowColor: Colors.energyGlow,
    pattern: [
      { phase: 'inhale', duration: 3, label: 'Pust inn' },
      { phase: 'exhale', duration: 3, label: 'Pust ut' },
    ],
    technique: 'Energizing breath',
    defaultDuration: 30,
  },
  {
    id: 'sleep',
    title: 'Søvn',
    subtitle: 'Dyp avslapning',
    description:
      'En forlenget utpust som senker hjerterytmen og forbereder kropp og sinn for dyp søvn.',
    icon: 'CloudMoon',
    glowColor: Colors.sleepGlow,
    pattern: [
      { phase: 'inhale', duration: 4, label: 'Pust inn' },
      { phase: 'exhale', duration: 8, label: 'Pust ut' },
    ],
    technique: '4-8 Dyp avslapning',
    defaultDuration: 120,
  },
  {
    id: 'balance',
    title: 'Balanse',
    subtitle: 'Finn midten',
    description:
      'Jevn pust som synkroniserer hjerte og lunger for optimal fysiologisk koherens.',
    icon: 'Activity',
    glowColor: Colors.balanceGlow,
    pattern: [
      { phase: 'inhale', duration: 5, label: 'Pust inn' },
      { phase: 'exhale', duration: 5, label: 'Pust ut' },
    ],
    technique: 'Koherent pusting',
    defaultDuration: 60,
  },
  {
    id: 'destress',
    title: 'Stressned',
    subtitle: 'Umiddelbar ro',
    description:
      'Inspirert av "physiological sigh". Den mest effektive måten å redusere akutt stress i sanntid.',
    icon: 'Wind',
    glowColor: Colors.destressGlow,
    pattern: [
      { phase: 'inhale', duration: 4, label: 'Pust inn' },
      { phase: 'exhale', duration: 6, label: 'Pust ut' },
      { phase: 'holdOut', duration: 2, label: 'Hold' },
    ],
    technique: 'Physiological sigh',
    defaultDuration: 60,
  },
];

export const DURATION_OPTIONS = [30, 60, 90, 120] as const;
