import React, { useCallback } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useHaptics } from '@/hooks/useHaptics';
import type { Exercise } from '@/constants/exercises';
import * as LucideIcons from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  hapticsEnabled?: boolean;
}

export default function ExerciseCard({
  exercise,
  index,
  onPress,
  isFavorite = false,
  onToggleFavorite,
  hapticsEnabled = true,
}: ExerciseCardProps) {
  const scale = useSharedValue(1);
  const { light } = useHaptics(hapticsEnabled);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const springConfig = { damping: 12, stiffness: 400 };

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, springConfig);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springConfig);
  }, [scale]);

  const handlePress = useCallback(() => {
    light();
    onPress();
  }, [light, onPress]);

  const LucideMap = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>;
  const IconComponent = LucideMap[exercise.icon] ?? LucideMap['Circle'];

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 100 + 200).duration(500).springify()}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        animatedStyle,
        {
          borderColor: `rgba(${parseInt(exercise.glowColor.slice(1, 3), 16)}, ${parseInt(exercise.glowColor.slice(3, 5), 16)}, ${parseInt(exercise.glowColor.slice(5, 7), 16)}, 0.15)`,
          shadowColor: exercise.glowColor,
        },
      ]}
    >
      <View style={[styles.glowBg, { backgroundColor: exercise.glowColor }]} />

      <View style={[styles.iconContainer, { backgroundColor: `${exercise.glowColor}25`, borderColor: `${exercise.glowColor}40` }]}>
        <IconComponent size={28} color={exercise.glowColor} strokeWidth={2} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{exercise.title}</Text>
        <Text style={styles.subtitle}>{exercise.subtitle}</Text>
      </View>

      {onToggleFavorite ? (
        <Pressable
          onPress={() => {
            light();
            onToggleFavorite();
          }}
          hitSlop={12}
          style={styles.favoriteBtn}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Fjern favoritt' : 'Legg til favoritt'}
        >
          <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteIconOn]}>
            {isFavorite ? '♥' : '♡'}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.arrow}>
        <Text style={[styles.arrowText, { color: exercise.glowColor }]}>›</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 22,
    backgroundColor: Colors.darkBaseCard,
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  glowBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  favoriteBtn: {
    padding: 6,
  },
  favoriteIcon: {
    fontSize: 22,
    color: Colors.textMuted,
  },
  favoriteIconOn: {
    color: Colors.energyGold,
  },
  arrow: {
    opacity: 0.8,
  },
  arrowText: {
    fontSize: 28,
    fontWeight: '300',
    marginTop: -4,
  },
});
