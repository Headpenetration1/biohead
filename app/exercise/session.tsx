import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, BackHandler, AppState } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { FadeIn, FadeInDown, ZoomIn, BounceIn } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { exercises } from '@/constants/exercises';
import { useAppContext } from '@/context/AppContext';
import { useBreathingEngine } from '@/hooks/useBreathingEngine';
import { useHaptics } from '@/hooks/useHaptics';
import { useBreathAudio } from '@/hooks/useBreathAudio';
import { formatTime } from '@/utils/formatTime';
import { logMindfulSessionIfEnabled } from '@/utils/appleHealthMindful';
import BreathingCircle from '@/components/BreathingCircle';
import StreakBadge from '@/components/StreakBadge';
import HapticButton from '@/components/HapticButton';
import { ExerciseSoundStrip } from '@/components/ExerciseSoundStrip';
import { getNextSoundMode } from '@/constants/sessionSoundUi';

export default function SessionScreen() {
  useKeepAwake();

  const { id, duration: durationParam, stress } = useLocalSearchParams<{
    id: string;
    duration: string;
    stress?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, completeSession, rateLastSession, updatePreferences } = useAppContext();
  const { success, light, medium } = useHaptics(state.hapticsEnabled);

  const exercise = exercises.find((e) => e.id === id);
  const totalDuration = Number(durationParam) || 60;
  const stressBefore = stress != null ? Math.max(1, Math.min(5, Math.round(Number(stress) || 3))) : undefined;

  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [effectScore, setEffectScore] = useState<number | null>(null);
  // Synchronous guard to make sure a completed session is logged exactly once,
  // even if the effect below runs twice (e.g. React Strict Mode) before
  // `setIsComplete(true)` has flushed.
  const hasLoggedCompletionRef = useRef(false);

  const engine = useBreathingEngine({
    pattern: exercise?.pattern ?? [],
    totalDuration,
    reduceMotion: state.reduceMotion,
  });

  const sessionActive = engine.isActive && !isComplete;

  useBreathAudio(
    state.soundMode,
    state.cueVolume,
    state.ambientSoundscape,
    state.ambientMix,
    sessionActive,
    engine.isPaused,
    engine.currentPhase,
    state.toneEnabled,
    state.toneFrequency,
    state.toneVolume
  );

  // Kick the breathing engine off once when the screen mounts with a valid
  // exercise. We guard with a ref instead of leaving the dep-array empty, so
  // re-renders (unstable engine reference, Strict Mode double-mount) cannot
  // accidentally start the engine twice or leave it stuck.
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    if (!exercise || isComplete) return;
    hasStartedRef.current = true;
    const timer = setTimeout(() => engine.start(), 500);
    return () => clearTimeout(timer);
  }, [exercise, engine, isComplete]);

  const prevPhase = useRef(engine.currentPhase);
  useEffect(() => {
    if (engine.isActive && !engine.isPaused && engine.currentPhase !== prevPhase.current) {
      prevPhase.current = engine.currentPhase;

      if (engine.currentPhase === 'inhale' || engine.currentPhase === 'exhale') {
        light();
      } else if (engine.currentPhase === 'hold' || engine.currentPhase === 'holdOut') {
        medium();
      }
    }
  }, [engine.currentPhase, engine.isActive, engine.isPaused, light, medium]);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isComplete) return false;
      setShowQuitModal(true);
      return true;
    });
    return () => handler.remove();
  }, [isComplete]);

  // Auto-pause when the app is backgrounded. Without this, `setInterval` in
  // the engine keeps ticking unreliably on iOS/Android (throttled by the OS)
  // while audio gets muted — the user returns to find the session far ahead
  // of where the audio / visual state suggests. We only auto-pause; resuming
  // is intentionally manual so the user chooses when to continue.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && engine.isActive && !engine.isPaused && !isComplete) {
        engine.pause();
      }
    });
    return () => sub.remove();
  }, [engine, isComplete]);

  useEffect(() => {
    if (hasLoggedCompletionRef.current) return;
    if (!engine.isActive && engine.totalProgress >= 1 && !isComplete) {
      hasLoggedCompletionRef.current = true;
      setIsComplete(true);
      success();
      if (exercise) {
        completeSession(exercise.id, totalDuration, stressBefore);
        void logMindfulSessionIfEnabled(state.healthSyncEnabled, totalDuration);
      }
    }
  }, [
    engine.isActive,
    engine.totalProgress,
    isComplete,
    exercise,
    totalDuration,
    stressBefore,
    completeSession,
    success,
    state.healthSyncEnabled,
  ]);

  const handlePauseResume = useCallback(() => {
    if (engine.isPaused) {
      engine.resume();
    } else {
      engine.pause();
    }
  }, [engine]);

  const cycleSoundMode = useCallback(() => {
    updatePreferences({ soundMode: getNextSoundMode(state.soundMode) });
    light();
  }, [state.soundMode, updatePreferences, light]);

  const toggleToneInSession = useCallback(() => {
    updatePreferences({ toneEnabled: !state.toneEnabled });
    light();
  }, [state.toneEnabled, updatePreferences, light]);

  const handleQuit = useCallback(() => {
    engine.stop();
    setShowQuitModal(false);
    router.back();
  }, [engine, router]);

  if (!exercise) {
    return (
      <View style={[styles.container, styles.missingRoot, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.missingTitle}>Fant ikke øvelsen</Text>
        <Text style={styles.missingBody}>
          Økten kunne ikke starte fordi øvelsen ikke finnes. Prøv å starte på nytt fra forsiden.
        </Text>
        <HapticButton title="Til forsiden" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const a11yBreathLabel = `${engine.isPaused ? 'Pause' : engine.currentLabel}, ${formatTime(engine.remainingSeconds)} gjenstår av økten`;

  if (isComplete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.bgGlow, { backgroundColor: exercise.glowColor }]} />

        <Animated.View
          entering={ZoomIn.delay(200).duration(500).springify()}
          style={[styles.checkCircle, { backgroundColor: `${exercise.glowColor}20`, borderColor: `${exercise.glowColor}40` }]}
        >
          <Text style={[styles.checkMark, { color: exercise.glowColor }]}>✓</Text>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(400).duration(500).springify()}
          style={styles.completeTitle}
        >
          Bra jobbet!
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(500).duration(500).springify()}
          style={styles.completeSummary}
        >
          Du fullførte {totalDuration >= 60 ? `${Math.floor(totalDuration / 60)} minutt${totalDuration >= 120 ? 'er' : ''}` : `${totalDuration} sekunder`}{'\n'}med {exercise.title}-øvelsen
        </Animated.Text>

        <Animated.View entering={BounceIn.delay(600).duration(500)}>
          <StreakBadge count={state.currentStreak} large />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(650).duration(500).springify()} style={styles.effectWrap}>
          <Text style={styles.effectTitle}>Hvor stressa føler du deg nå?</Text>
          <Text style={styles.effectSub}>1 = rolig, 5 = veldig stressa</Text>
          <View style={styles.effectRow}>
            {[1, 2, 3, 4, 5].map((score) => {
              const active = effectScore === score;
              return (
                <Pressable
                  key={score}
                  onPress={() => {
                    setEffectScore(score);
                    rateLastSession(score);
                  }}
                  style={[styles.effectChip, active && styles.effectChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Sett stressnivå etter økt til ${score} av 5`}
                  hitSlop={8}
                >
                  <Text style={[styles.effectChipText, active && styles.effectChipTextActive]}>{score}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(700).duration(500).springify()}
          style={styles.completeButtons}
        >
          <HapticButton
            title="Tilbake hjem"
            color={exercise.glowColor}
            onPress={() => router.replace('/')}
            style={{ width: '100%' }}
          />
          <HapticButton
            title="Gjør en til →"
            variant="secondary"
            onPress={() => {
              // Reset one-shot guards so the follow-up round is logged like
              // any other session (streak, history, widget, HealthKit).
              hasLoggedCompletionRef.current = false;
              hasStartedRef.current = false;
              setIsComplete(false);
              setEffectScore(null);
              engine.start();
            }}
            style={{ width: '100%' }}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.bgGlow, { backgroundColor: exercise.glowColor }]} />

      <View style={[styles.topBarOuter, { top: insets.top + 12 }]}>
        <View style={styles.topBarRow}>
          <Animated.View entering={FadeIn.delay(300).duration(400)}>
            <Pressable
              onPress={handlePauseResume}
              style={styles.topButton}
              accessibilityRole="button"
              accessibilityLabel={engine.isPaused ? 'Fortsett økt' : 'Pause økt'}
            >
              <Text style={styles.topButtonIcon}>{engine.isPaused ? '▶' : '❚❚'}</Text>
              <Text style={styles.topButtonText}>
                {engine.isPaused ? 'Fortsett' : 'Pause'}
              </Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(300).duration(400)}>
            <Pressable
              onPress={() => setShowQuitModal(true)}
              style={styles.topButton}
              accessibilityRole="button"
              accessibilityLabel="Avslutt økt"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.delay(350).duration(400)}>
          <ExerciseSoundStrip
            soundMode={state.soundMode}
            toneEnabled={state.toneEnabled}
            toneFrequency={state.toneFrequency}
            onCycleSoundMode={cycleSoundMode}
            onToggleTone={toggleToneInSession}
            onOpenMixer={() => router.push('/lydmikser' as Href)}
            kickerText="Lyd under økt"
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(200).duration(800)} style={[styles.circleArea, styles.circleAreaBelowSound]}>
        <BreathingCircle
          glowColor={exercise.glowColor}
          phaseLabel={engine.isPaused ? 'Pause' : engine.currentLabel}
          remainingSeconds={engine.remainingSeconds}
          totalProgress={engine.totalProgress}
          circleScale={engine.circleScale}
          glowOpacity={engine.glowOpacity}
          ringProgress={engine.ringProgress}
          accessibilityLabel={a11yBreathLabel}
        />
      </Animated.View>

      <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.bottomLabel}>
        <Text style={styles.exerciseName} accessibilityRole="header">
          {exercise.title}
        </Text>
      </Animated.View>

      <Modal
        visible={showQuitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.duration(300).springify()} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Avslutte økten?</Text>
            <Text style={styles.modalBody}>
              Fremgangen din vil ikke bli lagret.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowQuitModal(false)}
                style={styles.modalButtonSecondary}
                accessibilityRole="button"
                accessibilityLabel="Fortsett økten"
              >
                <Text style={styles.modalButtonSecondaryText}>Fortsett</Text>
              </Pressable>
              <Pressable
                onPress={handleQuit}
                style={styles.modalButtonDestructive}
                accessibilityRole="button"
                accessibilityLabel="Avslutt økten uten å lagre fremdrift"
              >
                <Text style={styles.modalButtonDestructiveText}>Avslutt</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingRoot: {
    paddingHorizontal: 24,
    gap: 12,
  },
  missingTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  missingBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  bgGlow: {
    position: 'absolute',
    top: '20%',
    width: 500,
    height: 500,
    borderRadius: 250,
    opacity: 0.1,
  },

  topBarOuter: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 10,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(14,32,37,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.05)',
  },
  topButtonIcon: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  topButtonText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
  },
  closeIcon: {
    fontSize: 16,
    color: Colors.textPrimary,
  },

  circleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Ekstra luft så pustesirkelen ikke skjules av det nye lyd-panelet øverst. */
  circleAreaBelowSound: {
    paddingTop: 108,
  },

  bottomLabel: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  exerciseName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 4,
  },

  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 32,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  checkMark: {
    fontSize: 42,
    fontWeight: '300',
  },
  completeTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  completeSummary: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
  },
  completeButtons: {
    width: '85%',
    maxWidth: 320,
    marginTop: 48,
    gap: 16,
  },
  effectWrap: {
    marginTop: 18,
    alignItems: 'center',
    gap: 4,
  },
  effectTitle: {
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
  },
  effectSub: {
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
  },
  effectRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },
  effectChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  effectChipActive: {
    borderColor: `${Colors.greenAccent}88`,
    backgroundColor: `${Colors.greenAccent}22`,
  },
  effectChipText: {
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  effectChipTextActive: {
    color: Colors.greenAccent,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14,32,37,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFF9ED',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.16)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalBody: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: 'rgba(14,32,37,0.10)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.18)',
  },
  modalButtonSecondaryText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
  },
  modalButtonDestructive: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: 'rgba(14,32,37,0.14)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.24)',
  },
  modalButtonDestructiveText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.error,
  },
});
