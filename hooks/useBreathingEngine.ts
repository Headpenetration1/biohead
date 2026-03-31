import { useEffect, useRef, useCallback, useState } from 'react';
import {
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  cancelAnimation,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import type { BreathingPattern, BreathingPhase } from '@/constants/exercises';

interface UseBreathingEngineProps {
  pattern: BreathingPattern[];
  totalDuration: number;
}

interface BreathingState {
  phase: BreathingPhase;
  label: string;
}

interface UseBreathingEngineReturn {
  isActive: boolean;
  isPaused: boolean;
  currentPhase: BreathingPhase;
  currentLabel: string;
  phaseProgress: number;
  totalProgress: number;
  remainingSeconds: number;
  circleScale: SharedValue<number>;
  glowOpacity: SharedValue<number>;
  ringProgress: SharedValue<number>;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useBreathingEngine({
  pattern,
  totalDuration,
}: UseBreathingEngineProps): UseBreathingEngineReturn {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [breathState, setBreathState] = useState<BreathingState>({
    phase: 'inhale',
    label: pattern[0]?.label ?? 'Pust inn',
  });
  const [phaseProgress, setPhaseProgress] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleDuration = pattern.reduce((sum, p) => sum + p.duration, 0);

  // Reanimated shared values
  const circleScale = useSharedValue(0.6);
  const glowOpacity = useSharedValue(0.2);
  const ringProgress = useSharedValue(0);

  // Beregn nåværende fase basert på elapsed time
  const computePhase = useCallback(
    (currentElapsed: number) => {
      const posInCycle = currentElapsed % cycleDuration;
      let accumulated = 0;

      for (const step of pattern) {
        if (posInCycle < accumulated + step.duration) {
          const phaseElapsed = posInCycle - accumulated;
          const progress = phaseElapsed / step.duration;
          return { phase: step.phase, label: step.label, progress };
        }
        accumulated += step.duration;
      }

      return { phase: pattern[0].phase, label: pattern[0].label, progress: 0 };
    },
    [pattern, cycleDuration]
  );

  // Animér pustesirkelen basert på fase
  const animatePhase = useCallback(
    (phase: BreathingPhase, phaseDuration: number, progress: number) => {
      const remainingMs = (1 - progress) * phaseDuration * 1000;

      cancelAnimation(circleScale);
      cancelAnimation(glowOpacity);

      const easingIn = Easing.bezier(0.4, 0, 0.2, 1);
      const easingOut = Easing.bezier(0.4, 0, 0.8, 1);

      switch (phase) {
        case 'inhale': {
          const currentScale = 0.6 + 0.4 * progress;
          circleScale.value = currentScale;
          circleScale.value = withTiming(1.0, {
            duration: remainingMs,
            easing: easingIn,
          });
          glowOpacity.value = withTiming(0.7, {
            duration: remainingMs,
            easing: easingIn,
          });
          break;
        }
        case 'hold': {
          circleScale.value = 1.0;
          circleScale.value = withRepeat(
            withSequence(
              withTiming(1.02, { duration: 800, easing: Easing.inOut(Easing.sin) }),
              withTiming(0.98, { duration: 800, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
          );
          glowOpacity.value = withTiming(0.5, { duration: 400 });
          break;
        }
        case 'exhale': {
          const currentScale = 1.0 - 0.4 * progress;
          circleScale.value = currentScale;
          circleScale.value = withTiming(0.6, {
            duration: remainingMs,
            easing: easingOut,
          });
          glowOpacity.value = withTiming(0.2, {
            duration: remainingMs,
            easing: easingOut,
          });
          break;
        }
        case 'holdOut': {
          circleScale.value = 0.6;
          circleScale.value = withRepeat(
            withSequence(
              withTiming(0.62, { duration: 800, easing: Easing.inOut(Easing.sin) }),
              withTiming(0.58, { duration: 800, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
          );
          glowOpacity.value = withTiming(0.15, { duration: 400 });
          break;
        }
      }
    },
    [circleScale, glowOpacity]
  );

  // Timer-loop
  useEffect(() => {
    if (isActive && !isPaused) {
      let lastPhaseKey = '';

      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 0.1;
          if (next >= totalDuration) {
            clearInterval(intervalRef.current!);
            runOnJS(setIsActive)(false);
            return totalDuration;
          }

          const { phase, label, progress } = computePhase(next);
          const phaseKey = `${phase}-${Math.floor(next / cycleDuration)}`;

          runOnJS(setBreathState)({ phase, label });
          runOnJS(setPhaseProgress)(progress);

          // Kun start ny animasjon ved fasebytte
          if (phaseKey !== lastPhaseKey) {
            lastPhaseKey = phaseKey;
            const step = pattern.find((p) => p.phase === phase);
            if (step) {
              animatePhase(phase, step.duration, 0);
            }
          }

          return next;
        });
      }, 100);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPaused, totalDuration, computePhase, cycleDuration, pattern, animatePhase]);

  // Ring progress
  useEffect(() => {
    ringProgress.value = withTiming(phaseProgress, {
      duration: 100,
      easing: Easing.linear,
    });
  }, [phaseProgress, ringProgress]);

  const start = useCallback(() => {
    setElapsed(0);
    setPhaseProgress(0);
    setBreathState({ phase: 'inhale', label: pattern[0]?.label ?? 'Pust inn' });
    circleScale.value = 0.6;
    glowOpacity.value = 0.2;
    ringProgress.value = 0;
    setIsActive(true);
    setIsPaused(false);
  }, [pattern, circleScale, glowOpacity, ringProgress]);

  const pause = useCallback(() => {
    setIsPaused(true);
    cancelAnimation(circleScale);
    cancelAnimation(glowOpacity);
  }, [circleScale, glowOpacity]);

  const resume = useCallback(() => {
    setIsPaused(false);
    const { phase, progress } = computePhase(elapsed);
    const step = pattern.find((p) => p.phase === phase);
    if (step) animatePhase(phase, step.duration, progress);
  }, [elapsed, computePhase, pattern, animatePhase]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsActive(false);
    setIsPaused(false);
    setElapsed(0);
    cancelAnimation(circleScale);
    cancelAnimation(glowOpacity);
    circleScale.value = 0.6;
    glowOpacity.value = 0.2;
  }, [circleScale, glowOpacity]);

  const remaining = Math.max(0, totalDuration - elapsed);
  const totalProgress = totalDuration > 0 ? Math.min(elapsed / totalDuration, 1) : 0;

  return {
    isActive,
    isPaused,
    currentPhase: breathState.phase,
    currentLabel: breathState.label,
    phaseProgress,
    totalProgress,
    remainingSeconds: Math.ceil(remaining),
    circleScale,
    glowOpacity,
    ringProgress,
    start,
    pause,
    resume,
    stop,
  };
}
