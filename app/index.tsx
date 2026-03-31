import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { exercises } from '@/constants/exercises';
import { useAppContext } from '@/context/AppContext';
import ExerciseCard from '@/components/ExerciseCard';
import StreakBadge from '@/components/StreakBadge';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAppContext();

  // Animated background orbs
  const orb1TranslateY = useSharedValue(0);
  const orb2TranslateX = useSharedValue(0);

  React.useEffect(() => {
    orb1TranslateY.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orb2TranslateX.value = withRepeat(
      withSequence(
        withTiming(50, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb1TranslateY.value }],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2TranslateX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Animated Ambient Background Orbs */}
      <Animated.View style={[styles.ambientGlow, styles.glow1, orb1Style]} />
      <Animated.View style={[styles.ambientGlow, styles.glow2, orb2Style]} />

      <ScrollView
        style={StyleSheet.absoluteFillObject}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.header}
        >
          <View style={{ width: 40 }} />
          <StreakBadge count={state.currentStreak} />
        </Animated.View>

        {/* Logo */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          style={styles.logoContainer}
        >
          <Image source={require('@/assets/icon.png')} style={styles.logoFace} />
          <View style={styles.logoTextRow}>
            <Text style={styles.logoBio}>bio</Text>
            <Text style={styles.logoHead}>head</Text>
          </View>
        </Animated.View>

        {/* Greeting */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(500).springify()}
          style={styles.greetingContainer}
        >
          <Text style={styles.greeting}>Hva trenger du nå?</Text>
        </Animated.View>

        {/* Exercise cards */}
        <View style={styles.cardsContainer}>
          {exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              index={i}
              onPress={() =>
                router.push({
                  pathname: '/exercise/[id]',
                  params: { id: ex.id },
                })
              }
            />
          ))}
        </View>

        {/* Session counter */}
        {state.sessions.length > 0 && (
          <Animated.View entering={FadeIn.delay(600).duration(800)} style={styles.counterContainer}>
            <View style={styles.counterPill}>
              <Text style={styles.counterText}>
                {state.sessions.length} økt{state.sessions.length !== 1 ? 'er' : ''} fullført
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBase,
  },
  content: {
    paddingHorizontal: 24,
  },
  ambientGlow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.12, // Vibrant but subtle blur
  },
  glow1: {
    top: -150,
    right: -100,
    backgroundColor: Colors.greenAccent,
  },
  glow2: {
    top: '30%',
    left: -180,
    backgroundColor: Colors.focusGlow,
    width: 500,
    height: 500,
    borderRadius: 250,
    opacity: 0.08,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 4,
  },
  logoFace: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoBio: {
    fontFamily: Typography.fontFamily.medium, // Thinner looks more premium
    fontSize: 42,
    color: Colors.textPrimary,
    letterSpacing: -2,
  },
  logoHead: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 42,
    color: Colors.greenAccent, // Neon cyan
    letterSpacing: -2,
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  greeting: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.xl,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  cardsContainer: {
    gap: 16,
  },
  counterContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  counterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  counterText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
