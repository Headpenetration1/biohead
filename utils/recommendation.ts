import type { Exercise } from '@/constants/exercises';
import type { SessionRecord } from '@/utils/storage';

type Goal = 'calm' | 'focus' | 'energy' | undefined;

interface RecommendationInput {
  sessions: SessionRecord[];
  exercises: Exercise[];
  goal: Goal;
  now?: Date;
}

export interface ExerciseRecommendation {
  exerciseId: Exercise['id'];
  reason: string;
}

function pickExisting(
  exercises: Exercise[],
  preferred: Exercise['id'],
  fallback: Exercise['id']
): Exercise['id'] {
  if (exercises.some((exercise) => exercise.id === preferred)) return preferred;
  return fallback;
}

export function getAdaptiveRecommendation({
  sessions,
  exercises,
  goal,
  now = new Date(),
}: RecommendationInput): ExerciseRecommendation | null {
  if (exercises.length === 0) return null;
  const hour = now.getHours();
  const totalSessions = sessions.length;

  if (hour >= 21 || hour < 6) {
    return {
      exerciseId: pickExisting(exercises, 'sleep', 'calm'),
      reason: 'Kveld: lengre utpust fungerer ofte best for nedroing.',
    };
  }

  if (hour >= 6 && hour < 10) {
    return {
      exerciseId: pickExisting(exercises, 'energy', 'focus'),
      reason: 'Morgen: start med et kort, energigivende mønster.',
    };
  }

  const recent = sessions.slice(-5);
  const frequentRecent = new Map<string, number>();
  for (const session of recent) {
    frequentRecent.set(
      session.exerciseId,
      (frequentRecent.get(session.exerciseId) ?? 0) + 1
    );
  }
  const repeatedHighStress = (frequentRecent.get('energy') ?? 0) + (frequentRecent.get('focus') ?? 0) >= 3;
  if (repeatedHighStress) {
    return {
      exerciseId: pickExisting(exercises, 'calm', 'balance'),
      reason: 'Mange aktive økter nylig: balanser med en roligere variant.',
    };
  }

  if (goal && totalSessions < 12 && exercises.some((exercise) => exercise.id === goal)) {
    return {
      exerciseId: goal,
      reason: 'Bygger vane: holder deg på målet du valgte i onboarding.',
    };
  }

  return {
    exerciseId: pickExisting(exercises, 'balance', exercises[0].id),
    reason: 'Jevn pust er et trygt standardvalg når dagen er variert.',
  };
}
