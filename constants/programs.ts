import type { ExerciseId } from '@/constants/exercises';

export type ProgramId = 'calm7' | 'focus7' | 'sleep7';

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
];

export function getProgramById(id?: string): ProgramDefinition | undefined {
  if (!id) return undefined;
  return PROGRAMS.find((program) => program.id === id);
}
