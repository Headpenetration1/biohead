import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, BounceIn } from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';

interface StreakBadgeProps {
  count: number;
  large?: boolean;
}

export default function StreakBadge({ count, large = false }: StreakBadgeProps) {
  if (count < 1) return null;

  return (
    <Animated.View
      entering={BounceIn.delay(300).duration(500)}
      style={[
        styles.badge,
        large && styles.badgeLarge,
      ]}
    >
      <Flame
        size={large ? 20 : 14}
        color={Colors.energyGold}
        fill={Colors.energyGold}
        strokeWidth={2}
      />
      <Text style={[styles.text, large && styles.textLarge]}>
        {count} {count === 1 ? 'dag' : 'dager'}
        {large ? ' i rad!' : ''}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 16, // slightly wider
    backgroundColor: 'rgba(255, 158, 0, 0.12)', // energyGold glow
    borderWidth: 1,
    borderColor: 'rgba(255, 158, 0, 0.3)',
    borderRadius: 100,
    shadowColor: Colors.energyGold, // Add subtle shadow for glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeLarge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  text: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: 13,
    color: Colors.energyGold,
  },
  textLarge: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
  },
});
