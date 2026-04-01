import type { ExerciseId } from '@/constants/exercises';

export type ProgramId = 'calm7' | 'focus7' | 'sleep7' | 'resilience14' | 'deepFocus10' | 'recovery14';

export interface ProgramDay {
  day: number;
  exerciseId: ExerciseId;
  duration: number;
  label: string;
}

export interface ProgramDefinition {
  id: ProgramId;
  title: string;
  subtitle: string;
  description: string;
  days: ProgramDay[];
}

export const PROGRAMS: ProgramDefinition[] = [
  {
    id: 'calm7',
    title: '7 dager ro',
    subtitle: 'Mindre stress, mer balanse',
    description: 'Et rolig opplegg som gradvis bygger vane rundt nedregulering av kroppen.',
    days: [
      { day: 1, exerciseId: 'calm', duration: 60, label: 'Myk start' },
      { day: 2, exerciseId: 'balance', duration: 60, label: 'Jevn rytme' },
      { day: 3, exerciseId: 'destress', duration: 60, label: 'Stressned' },
      { day: 4, exerciseId: 'calm', duration: 90, label: 'Lenger utpust' },
      { day: 5, exerciseId: 'triangle', duration: 60, label: 'Stabilitet' },
      { day: 6, exerciseId: 'slow', duration: 90, label: 'Senk tempoet' },
      { day: 7, exerciseId: 'stretch', duration: 90, label: 'Integrering' },
    ],
  },
  {
    id: 'focus7',
    title: '7 dager fokus',
    subtitle: 'Skjerp oppmerksomheten',
    description: 'Korte økter designet for mental klarhet gjennom dagen.',
    days: [
      { day: 1, exerciseId: 'focus', duration: 60, label: 'Box start' },
      { day: 2, exerciseId: 'energy', duration: 60, label: 'Aktivering' },
      { day: 3, exerciseId: 'focus', duration: 90, label: 'Dypere fokus' },
      { day: 4, exerciseId: 'triangle', duration: 60, label: 'Rytmisk nærvær' },
      { day: 5, exerciseId: 'balance', duration: 60, label: 'Klarhet + ro' },
      { day: 6, exerciseId: 'focus', duration: 90, label: 'Stabil flyt' },
      { day: 7, exerciseId: 'energy', duration: 60, label: 'Fokusfinale' },
    ],
  },
  {
    id: 'sleep7',
    title: '7 dager søvn',
    subtitle: 'Rolig overgang til natt',
    description: 'Kveldsprogram med lengre utpust og gradvis dypere nedroing.',
    days: [
      { day: 1, exerciseId: 'sleep', duration: 90, label: 'Kveld rolig' },
      { day: 2, exerciseId: 'stretch', duration: 90, label: 'Lang utpust' },
      { day: 3, exerciseId: 'calm', duration: 90, label: 'Skru ned tempo' },
      { day: 4, exerciseId: 'sleep', duration: 120, label: 'Dyp hvile' },
      { day: 5, exerciseId: 'slow', duration: 90, label: 'Sakte pust' },
      { day: 6, exerciseId: 'deepSigh', duration: 60, label: 'Slipp spenning' },
      { day: 7, exerciseId: 'sleep', duration: 120, label: 'Søvnfinale' },
    ],
  },
  {
    id: 'resilience14',
    title: '14 dager robust ro',
    subtitle: 'Bygg stress-toleranse gradvis',
    description:
      'Et mer avansert opplegg som veksler mellom nedregulering og stabilisering for å bygge robust pustevane over tid.',
    days: [
      { day: 1, exerciseId: 'destress', duration: 60, label: 'Reset' },
      { day: 2, exerciseId: 'calm', duration: 90, label: 'Lenger utpust' },
      { day: 3, exerciseId: 'balance', duration: 90, label: 'Jevn rytme' },
      { day: 4, exerciseId: 'triangle', duration: 90, label: 'Kontroll' },
      { day: 5, exerciseId: 'slow', duration: 120, label: 'Senk tempo' },
      { day: 6, exerciseId: 'stretch', duration: 120, label: 'Dyp ro' },
      { day: 7, exerciseId: 'sleep', duration: 120, label: 'Kveldsreset' },
      { day: 8, exerciseId: 'destress', duration: 90, label: 'Rask nedregulering' },
      { day: 9, exerciseId: 'balance', duration: 120, label: 'Stabilitet' },
      { day: 10, exerciseId: 'calm', duration: 120, label: 'Utpust-fokus' },
      { day: 11, exerciseId: 'deepSigh', duration: 90, label: 'Spenningsslipp' },
      { day: 12, exerciseId: 'slow', duration: 150, label: 'Lang syklus' },
      { day: 13, exerciseId: 'stretch', duration: 150, label: 'Integrering' },
      { day: 14, exerciseId: 'calm', duration: 180, label: 'Finale: dyp ro' },
    ],
  },
  {
    id: 'deepFocus10',
    title: '10 dager dyp fokus',
    subtitle: 'Mer krevende oppmerksomhetstrening',
    description:
      'For deg som vil trene konsentrasjon mer systematisk. Progressiv økning i varighet og rytmisk kontroll.',
    days: [
      { day: 1, exerciseId: 'focus', duration: 60, label: 'Fokus-baseline' },
      { day: 2, exerciseId: 'energy', duration: 60, label: 'Aktivering' },
      { day: 3, exerciseId: 'focus', duration: 90, label: 'Lenger fokusblokk' },
      { day: 4, exerciseId: 'triangle', duration: 90, label: 'Presisjon' },
      { day: 5, exerciseId: 'balance', duration: 120, label: 'Rolig klarhet' },
      { day: 6, exerciseId: 'focus', duration: 120, label: 'Dypere flyt' },
      { day: 7, exerciseId: 'energy', duration: 90, label: 'Fokus + energi' },
      { day: 8, exerciseId: 'triangle', duration: 120, label: 'Rytmekontroll' },
      { day: 9, exerciseId: 'focus', duration: 150, label: 'Lang blokk' },
      { day: 10, exerciseId: 'balance', duration: 150, label: 'Finale: stabil fokus' },
    ],
  },
  {
    id: 'recovery14',
    title: '14 dager restitusjon',
    subtitle: 'Nervøs-system vennlig progresjon',
    description:
      'Et rolig, mer komplekst restitusjonsprogram for perioder med høy belastning, lite søvn eller mye stress.',
    days: [
      { day: 1, exerciseId: 'sleep', duration: 90, label: 'Rolig kveld' },
      { day: 2, exerciseId: 'stretch', duration: 90, label: 'Lang utpust' },
      { day: 3, exerciseId: 'calm', duration: 90, label: 'Skru ned' },
      { day: 4, exerciseId: 'slow', duration: 120, label: 'Lav frekvens' },
      { day: 5, exerciseId: 'deepSigh', duration: 90, label: 'Spenningsslipp' },
      { day: 6, exerciseId: 'sleep', duration: 120, label: 'Dyp hvile' },
      { day: 7, exerciseId: 'balance', duration: 90, label: 'Mild stabilisering' },
      { day: 8, exerciseId: 'calm', duration: 120, label: 'Utpusttrening' },
      { day: 9, exerciseId: 'stretch', duration: 120, label: 'Myk reset' },
      { day: 10, exerciseId: 'sleep', duration: 150, label: 'Kveldsdybde' },
      { day: 11, exerciseId: 'slow', duration: 150, label: 'Langsom flyt' },
      { day: 12, exerciseId: 'deepSigh', duration: 120, label: 'Akutt ro' },
      { day: 13, exerciseId: 'calm', duration: 150, label: 'Stille fokus' },
      { day: 14, exerciseId: 'sleep', duration: 180, label: 'Finale: dyp restitusjon' },
    ],
  },
];

export function getProgramById(id?: string): ProgramDefinition | undefined {
  if (!id) return undefined;
  return PROGRAMS.find((program) => program.id === id);
}
