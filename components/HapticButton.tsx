import React, { useCallback } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useHaptics } from '@/hooks/useHaptics';
import { useAppContext } from '@/context/AppContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface HapticButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function HapticButton({
  title,
  onPress,
  variant = 'primary',
  color = Colors.greenAccent,
  style,
  textStyle,
}: HapticButtonProps) {
  const scale = useSharedValue(1);
  const { state } = useAppContext();
  const { medium } = useHaptics(state.hapticsEnabled);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const springConfig = { damping: 12, stiffness: 400 };

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.94, springConfig);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springConfig);
  }, [scale]);

  const handlePress = useCallback(() => {
    medium();
    onPress();
  }, [medium, onPress]);

  const buttonStyle = (() => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 8,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: 'rgba(255,249,237,0.12)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
    }
  })();

  const labelStyle = (() => {
    switch (variant) {
      case 'primary':
        return { color: Colors.lightBeige, fontFamily: Typography.fontFamily.bold };
      case 'secondary':
        return { color: Colors.textSecondary, fontFamily: Typography.fontFamily.medium };
      case 'ghost':
        return { color: Colors.textSecondary, fontFamily: Typography.fontFamily.medium };
    }
  })();

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, buttonStyle, animatedStyle, style]}
    >
      <Text style={[styles.label, labelStyle, textStyle]}>{title}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 18, // Slightly taller
    paddingHorizontal: 24,
    borderRadius: 20, // Sleeker pill/rounded rect
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1, // Add border to match glassy layout
    borderColor: 'transparent',
  },
  label: {
    fontSize: Typography.sizes.base,
    letterSpacing: 0.8, // More premium letter spacing
    textTransform: 'uppercase', // Bold, actionable look
  },
});
