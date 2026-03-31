import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn, BounceIn } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { exercises } from '@/constants/exercises';
import { useAppContext } from '@/context/AppContext';
import { useBreathingEngine } from '@/hooks/useBreathingEngine';
import { useHaptics } from '@/hooks/useHaptics';
import BreathingCircle from '@/components/BreathingCircle';
import StreakBadge from '@/components/StreakBadge';
import HapticButton from '@/components/HapticButton';

export default function SessionScreen() {
  const { id, duration: durationParam } = useLocalSearchParams<{
    id: string;
    duration: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, completeSession } = useAppContext();
  const { success, light, medium } = useHaptics();

  const exercise = exercises.find((e) => e.id === id);
  const totalDuration = Number(durationParam) || 60;

  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const engine = useBreathingEngine({
    pattern: exercise?.pattern ?? [],
    totalDuration,
  });

  // Start automatisk
  useEffect(() => {
    if (exercise && !engine.isActive && !isComplete) {
      const timer = setTimeout(() => engine.start(), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Haptics ved fasebytte i pusten
  const prevPhase = useRef(engine.currentPhase);
  useEffect(() => {
    if (engine.isActive && !engine.isPaused && engine.currentPhase !== prevPhase.current) {
      prevPhase.current = engine.currentPhase;

      // Lett feedback for pust in/ut, medium for holdes
      if (engine.currentPhase === 'inhale' || engine.currentPhase === 'exhale') {
        light();
      } else if (engine.currentPhase === 'hold' || engine.currentPhase === 'holdOut') {
        medium();
      }
    }
  }, [engine.currentPhase, engine.isActive, engine.isPaused, light, medium]);

  // Android: intercept hardware back
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isComplete) return false; // allow normal back when done
      setShowQuitModal(true);
      return true; // prevent default back
    });
    return () => handler.remove();
  }, [isComplete]);

  // Sjekk om ferdig
  useEffect(() => {
    if (!engine.isActive && engine.totalProgress >= 1 && !isComplete) {
      setIsComplete(true);
      success();
      if (exercise) {
        completeSession(exercise.id, totalDuration);
      }
    }
  }, [engine.isActive, engine.totalProgress, isComplete, exercise, totalDuration, completeSession, success]);

  const handlePauseResume = useCallback(() => {
    if (engine.isPaused) {
      engine.resume();
    } else {
      engine.pause();
    }
  }, [engine]);

  const handleQuit = useCallback(() => {
    engine.stop();
    setShowQuitModal(false);
    router.back();
  }, [engine, router]);

  if (!exercise) return null;

  // ═══════ FULLFØRT-SKJERM ═══════
  if (isComplete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.bgGlow, { backgroundColor: exercise.glowColor }]} />

        {/* Checkmark */}
        <Animated.View
          entering={ZoomIn.delay(200).duration(500).springify()}
          style={[styles.checkCircle, { backgroundColor: `${exercise.glowColor}20`, borderColor: `${exercise.glowColor}40` }]}
        >
          <Text style={[styles.checkMark, { color: exercise.glowColor }]}>✓</Text>
        </Animated.View>

        {/* Tittel */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(500).springify()}
          style={styles.completeTitle}
        >
          Bra jobbet!
        </Animated.Text>

        {/* Oppsummering */}
        <Animated.Text
          entering={FadeInDown.delay(500).duration(500).springify()}
          style={styles.completeSummary}
        >
          Du fullførte {totalDuration >= 60 ? `${Math.floor(totalDuration / 60)} minutt${totalDuration >= 120 ? 'er' : ''}` : `${totalDuration} sekunder`}{'\n'}med {exercise.title}-øvelsen
        </Animated.Text>

        {/* Streak */}
        <Animated.View entering={BounceIn.delay(600).duration(500)}>
          <StreakBadge count={state.currentStreak} large />
        </Animated.View>

        {/* Knapper */}
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
              setIsComplete(false);
              engine.start();
            }}
            style={{ width: '100%' }}
          />
        </Animated.View>
      </View>
    );
  }

  // ═══════ AKTIV SESJON ═══════
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.bgGlow, { backgroundColor: exercise.glowColor }]} />

      {/* Topbar: Pause + Close */}
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <Animated.View entering={FadeIn.delay(300).duration(400)}>
          <Pressable onPress={handlePauseResume} style={styles.topButton}>
            <Text style={styles.topButtonIcon}>{engine.isPaused ? '▶' : '❚❚'}</Text>
            <Text style={styles.topButtonText}>
              {engine.isPaused ? 'Fortsett' : 'Pause'}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300).duration(400)}>
          <Pressable onPress={() => setShowQuitModal(true)} style={styles.topButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Pustesirkel */}
      <Animated.View
        entering={FadeIn.delay(200).duration(800)}
        style={styles.circleArea}
      >
        <BreathingCircle
          glowColor={exercise.glowColor}
          phaseLabel={engine.isPaused ? 'Pause' : engine.currentLabel}
          remainingSeconds={engine.remainingSeconds}
          totalProgress={engine.totalProgress}
          circleScale={engine.circleScale}
          glowOpacity={engine.glowOpacity}
          ringProgress={engine.ringProgress}
        />
      </Animated.View>

      {/* Øvelsesnavn */}
      <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.bottomLabel}>
        <Text style={styles.exerciseName}>{exercise.title}</Text>
      </Animated.View>

      {/* Quit-modal */}
      <Modal visible={showQuitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={ZoomIn.duration(300).springify()}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Avslutte økten?</Text>
            <Text style={styles.modalBody}>
              Fremgangen din vil ikke bli lagret.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowQuitModal(false)}
                style={styles.modalButtonSecondary}
              >
                <Text style={styles.modalButtonSecondaryText}>Fortsett</Text>
              </Pressable>
              <Pressable onPress={handleQuit} style={styles.modalButtonDestructive}>
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
    backgroundColor: Colors.darkBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgGlow: {
    position: 'absolute',
    top: '20%',
    width: 500,
    height: 500,
    borderRadius: 250,
    opacity: 0.1, // Stronger, more vibrant glow behind the orb
  },

  // Topbar
  topBar: {
    position: 'absolute',
    top: 0, // Will be overridden by dynamic insets in JSX
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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

  // Circle area
  circleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom
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

  // Complete screen
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,5,8,0.85)', // Deep midnight overlay
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: 'rgba(255,255,255,0.05)', // Glassmorphism
    borderRadius: 28,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalButtonSecondaryText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  modalButtonDestructive: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,42,85,0.15)', // Vibrant error color
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,42,85,0.3)',
  },
  modalButtonDestructiveText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.error,
  },
});
