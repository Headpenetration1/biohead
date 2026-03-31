import React, { useState } from 'react';
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

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const exercise = exercises.find((e) => e.id === id);
  const [duration, setDuration] = useState(exercise?.defaultDuration ?? 60);

  if (!exercise) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Bakgrunnsglow */}
      <View
        style={[
          styles.bgGlow,
          { backgroundColor: exercise.glowColor },
        ]}
      />

      {/* Tilbake-knapp */}
      <Animated.View entering={FadeIn.duration(400)}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Tilbake</Text>
        </Pressable>
      </Animated.View>

      {/* Ikon */}
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
          {(() => {
            const IconComponent = (LucideIcons as any)[exercise.icon];
            return IconComponent ? (
              <IconComponent size={72} color={exercise.glowColor} strokeWidth={1.5} />
            ) : null;
          })()}
        </Animated.View>
      </Animated.View>

      {/* Tittel */}
      <Animated.Text
        entering={FadeInDown.delay(150).duration(500).springify()}
        style={styles.title}
      >
        {exercise.title}
      </Animated.Text>

      {/* Beskrivelse */}
      <Animated.Text
        entering={FadeInDown.delay(200).duration(500).springify()}
        style={styles.description}
      >
        {exercise.description}
      </Animated.Text>

      {/* Varighetsvelger */}
      <Animated.View
        entering={FadeInDown.delay(250).duration(500).springify()}
        style={styles.pickerSection}
      >
        <Text style={styles.sectionLabel}>Varighet</Text>
        <DurationPicker
          value={duration}
          onChange={setDuration}
          glowColor={exercise.glowColor}
        />
      </Animated.View>

      {/* Start-knapp */}
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

      {/* Teknikk-info */}
      <Animated.View
        entering={FadeInDown.delay(350).duration(500).springify()}
        style={styles.techniqueBox}
      >
        <Text style={styles.techniqueLabel}>{exercise.technique}</Text>
        <View style={styles.patternRow}>
          {exercise.pattern.map((step, i) => (
            <View
              key={i}
              style={[styles.patternChip, { backgroundColor: `${exercise.glowColor} 12` }]}
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
    opacity: 0.1, // Stronger glow for the hero section
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 32,
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
    width: 88, // Larger icon
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
  iconContainer: {
    // This container is just for the ZoomIn animation, no specific styles needed here
  },
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
    backgroundColor: 'rgba(255,255,255,0.02)', // Glassy
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    borderColor: 'rgba(255,255,255,0.03)',
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
