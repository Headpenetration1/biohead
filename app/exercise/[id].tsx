import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { exercises } from '@/constants/exercises';
import * as LucideIcons from 'lucide-react-native';
import DurationPicker from '@/components/DurationPicker';
import HapticButton from '@/components/HapticButton';
import { useAppContext } from '@/context/AppContext';
import { useHaptics } from '@/hooks/useHaptics';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, toggleFavorite, setExerciseDuration } = useAppContext();
  const { light } = useHaptics(state.hapticsEnabled);

  const exercise = exercises.find((e) => e.id === id);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    const ex = exercises.find((e) => e.id === id);
    if (!ex) return;
    const saved = state.exerciseDurationPrefs[id];
    setDuration(saved != null ? saved : ex.defaultDuration);
  }, [id, state.exerciseDurationPrefs]);

  const onDurationChange = useCallback(
    (value: number) => {
      setDuration(value);
      if (exercise) setExerciseDuration(exercise.id, value);
    },
    [exercise, setExerciseDuration]
  );

  if (!exercise) return null;

  const isFavorite = state.favorites.includes(exercise.id);
  const IconComponent = (
    LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>
  )[exercise.icon];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.bgGlow,
          { backgroundColor: exercise.glowColor },
        ]}
      />

      <Animated.View entering={FadeIn.duration(400)} style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Tilbake</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            light();
            toggleFavorite(exercise.id);
          }}
          style={styles.favButton}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Fjern favoritt' : 'Legg til favoritt'}
        >
          <Text style={[styles.favIcon, isFavorite && styles.favIconOn]}>
            {isFavorite ? '♥' : '♡'}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(500).springify()}
        style={[
          styles.iconBox,
          {
            backgroundColor: `${exercise.glowColor}15`,
            borderColor: `${exercise.glowColor}25`,
          },
        ]}
      >
        <Animated.View style={styles.iconContainer} entering={ZoomIn.duration(600).springify()}>
          {IconComponent ? (
            <IconComponent size={72} color={exercise.glowColor} strokeWidth={1.5} />
          ) : null}
        </Animated.View>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(150).duration(500).springify()}
        style={styles.title}
      >
        {exercise.title}
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(200).duration(500).springify()}
        style={styles.description}
      >
        {exercise.description}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(250).duration(500).springify()}
        style={styles.pickerSection}
      >
        <Text style={styles.sectionLabel}>Varighet</Text>
        <DurationPicker
          value={duration}
          onChange={onDurationChange}
          glowColor={exercise.glowColor}
          hapticsEnabled={state.hapticsEnabled}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(500).springify()}
        style={styles.startSection}
      >
        <HapticButton
          title="Start øvelse"
          color={exercise.glowColor}
          onPress={() =>
            router.push({
              pathname: '/exercise/session',
              params: { id: exercise.id, duration: String(duration) },
            })
          }
          style={{ width: '100%' }}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(350).duration(500).springify()}
        style={styles.techniqueBox}
      >
        <Text style={styles.techniqueLabel}>{exercise.technique}</Text>
        <View style={styles.patternRow}>
          {exercise.pattern.map((step, i) => (
            <View
              key={i}
              style={[styles.patternChip, { backgroundColor: `${exercise.glowColor}12` }]}
            >
              <Text style={[styles.patternDuration, { color: exercise.glowColor }]}>
                {step.duration}s
              </Text>
              <Text style={styles.patternLabel}>{step.label.toLowerCase()}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBase,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  bgGlow: {
    position: 'absolute',
    top: '15%',
    alignSelf: 'center',
    width: 500,
    height: 500,
    borderRadius: 250,
    opacity: 0.1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(14,32,37,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.05)',
  },
  favButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,32,37,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.05)',
  },
  favIcon: {
    fontSize: 22,
    color: Colors.textMuted,
  },
  favIconOn: {
    color: Colors.energyGold,
  },
  backArrow: {
    fontSize: 22,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  backText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {},
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
    marginBottom: 40,
  },
  pickerSection: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 28,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  startSection: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 32,
  },
  techniqueBox: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    backgroundColor: 'rgba(14,32,37,0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.05)',
    gap: 16,
  },
  techniqueLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  patternRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  patternChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.03)',
  },
  patternDuration: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
  },
  patternLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
});
