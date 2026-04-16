import type { BreathingPattern, BreathingPhase } from '@/constants/exercises';

export interface PhaseSnapshot {
  phase: BreathingPhase;
  label: string;
  /** 0..1 progress through the current phase */
  progress: number;
  /** Index of the current step in `pattern` */
  stepIndex: number;
}

/**
 * Pure function that maps an elapsed-seconds value onto the current breathing
 * phase for a given pattern. Extracted from `useBreathingEngine` so it can be
 * unit tested without pulling in React / Reanimated.
 *
 * - `pattern` must contain at least one step. An empty pattern returns a
 *   sensible fallback instead of throwing, since screens can briefly render
 *   before the pattern is ready.
 * - Elapsed time wraps around the full cycle length, so the same function
 *   handles both "first breath" and "15th breath" correctly.
 */
export function computePhaseSnapshot(
  pattern: BreathingPattern[],
  elapsedSeconds: number
): PhaseSnapshot {
  if (pattern.length === 0) {
    return { phase: 'inhale', label: 'Pust inn', progress: 0, stepIndex: 0 };
  }
  const cycleDuration = pattern.reduce((sum, p) => sum + p.duration, 0);
  if (cycleDuration <= 0) {
    return { phase: pattern[0].phase, label: pattern[0].label, progress: 0, stepIndex: 0 };
  }
  const safeElapsed = Math.max(0, elapsedSeconds);
  const posInCycle = safeElapsed % cycleDuration;

  let accumulated = 0;
  for (let stepIndex = 0; stepIndex < pattern.length; stepIndex += 1) {
    const step = pattern[stepIndex];
    if (posInCycle < accumulated + step.duration) {
      const phaseElapsed = posInCycle - accumulated;
      const progress = step.duration > 0 ? phaseElapsed / step.duration : 0;
      return { phase: step.phase, label: step.label, progress, stepIndex };
    }
    accumulated += step.duration;
  }

  // Fallthrough (shouldn't happen when cycleDuration > 0, but stay safe).
  return { phase: pattern[0].phase, label: pattern[0].label, progress: 0, stepIndex: 0 };
}
