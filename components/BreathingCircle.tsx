import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { formatTime } from '@/utils/formatTime';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BreathingCircleProps {
  glowColor: string;
  phaseLabel: string;
  remainingSeconds: number;
  totalProgress: number;
  circleScale: SharedValue<number>;
  glowOpacity: SharedValue<number>;
  ringProgress: SharedValue<number>;
}

const CIRCLE_R = 80;
const PROGRESS_R = 100;
const SIZE = 260;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * PROGRESS_R;

export default function BreathingCircle({
  glowColor,
  phaseLabel,
  remainingSeconds,
  totalProgress,
  circleScale,
  glowOpacity,
  ringProgress,
}: BreathingCircleProps) {
  // Animert hovedsirkel (Outer Core)
  const animatedCircleProps = useAnimatedProps(() => ({
    r: CIRCLE_R * circleScale.value,
    opacity: 0.2 + glowOpacity.value * 0.4,
  }));

  // Animert indre sirkel (Inner Core)
  const animatedInnerProps = useAnimatedProps(() => ({
    r: CIRCLE_R * circleScale.value * 0.75, // Slightly larger base
    opacity: 0.15 + glowOpacity.value * 0.2,
  }));

  // Pulserende senterkjerne
  const animatedCenterProps = useAnimatedProps(() => ({
    r: CIRCLE_R * circleScale.value * 0.4,
    opacity: 0.3 + glowOpacity.value * 0.5,
  }));

  // Animert glow
  const glowStyle = useAnimatedStyle(() => ({
    width: SIZE * circleScale.value * 1.5, // Even bigger glow spread
    height: SIZE * circleScale.value * 1.5,
    opacity: glowOpacity.value * 0.6,
  }));

  // Progressring
  const animatedRingProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - ringProgress.value),
  }));

  return (
    <View style={styles.container}>
      {/* Ytre glow */}
      <Animated.View
        style={[
          styles.glow,
          { backgroundColor: glowColor },
          glowStyle,
        ]}
      />

      {/* SVG */}
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <RadialGradient id="breathGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={glowColor} stopOpacity="0.4" />
            <Stop offset="70%" stopColor={glowColor} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={glowColor} stopOpacity="0.02" />
          </RadialGradient>
        </Defs>

        {/* Bakgrunnsring */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={PROGRESS_R}
          fill="none"
          stroke={glowColor}
          strokeWidth={2.5}
          strokeOpacity={0.1}
        />

        {/* Animert progressring */}
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          r={PROGRESS_R}
          fill="none"
          stroke={glowColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedRingProps}
          rotation={-90}
          origin={`${CENTER}, ${CENTER}`}
        />

        {/* Outer Hovedsirkel */}
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          fill="url(#breathGrad)"
          stroke={glowColor}
          strokeWidth={1}
          animatedProps={animatedCircleProps}
        />

        {/* Indre sirkel */}
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          fill={glowColor}
          animatedProps={animatedInnerProps}
        />

        {/* Dense Center Core */}
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          fill={glowColor}
          animatedProps={animatedCenterProps}
        />
      </Svg>

      {/* Faselabel & Timer Wrap for better positioning over the orb */}
      <View style={styles.centerTextContainer}>
        <Animated.Text style={styles.timer}>
          {formatTime(remainingSeconds)}
        </Animated.Text>
        <Animated.Text style={[styles.phaseLabel]}>
          {phaseLabel}
        </Animated.Text>
      </View>

      {/* Total progress bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${totalProgress * 100}%`,
              backgroundColor: glowColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    top: '50%',
    left: '50%',
    transform: [{ translateX: -SIZE * 1.5 / 2 }, { translateY: -SIZE * 1.5 / 2 - 30 }],
  },
  centerTextContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -15 }], // offset slight top shift
  },
  phaseLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  timer: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 42,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  progressBarBg: {
    width: 180,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
