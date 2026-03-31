import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, Pressable } from 'react-native';
import { useRouter, Redirect, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
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
  const { state, toggleFavorite } = useAppContext();

  const orb1TranslateY = useSharedValue(0);
  const orb2TranslateX = useSharedValue(0);

  React.useEffect(() => {
    if (state.reduceMotion) {
      orb1TranslateY.value = 0;
      orb2TranslateX.value = 0;
      return;
    }
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
  }, [state.reduceMotion, orb1TranslateY, orb2TranslateX]);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb1TranslateY.value }],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2TranslateX.value }],
  }));

  const sortedExercises = useMemo(() => {
    const goal = state.userGoal;
    if (!goal) return exercises;
    const match = exercises.find((e) => e.id === goal);
    if (!match) return exercises;
    const rest = exercises.filter((e) => e.id !== goal);
    return [match, ...rest];
  }, [state.userGoal]);

  const favoriteSet = useMemo(() => new Set(state.favorites), [state.favorites]);

  if (state.isLoading) {
    return <View style={[styles.container, styles.loading]} />;
  }

  if (!state.hasCompletedOnboarding) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  return (
    <View style={styles.container}>
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
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <Pressable
            onPress={() => router.push('/settings' as Href)}
            style={styles.headerIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Innstillinger"
          >
            <Text style={styles.headerIcon}>⚙</Text>
          </Pressable>
          <StreakBadge count={state.currentStreak} />
          <Pressable
            onPress={() => router.push('/history' as Href)}
            style={styles.headerIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Historikk"
          >
            <Text style={styles.headerIcon}>◇</Text>
          </Pressable>
        </Animated.View>

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

        <Animated.View
          entering={FadeInDown.delay(150).duration(500).springify()}
          style={styles.greetingContainer}
        >
          {state.userGoal ? (
            <>
              <Text style={styles.greetingHint}>Anbefalt for deg</Text>
              <Text style={styles.greeting}>
                {state.userGoal === 'calm' && 'Finn roen'}
                {state.userGoal === 'focus' && 'Skjerper fokus'}
                {state.userGoal === 'energy' && 'Lad opp'}
              </Text>
            </>
          ) : (
            <Text style={styles.greeting}>Hva trenger du nå?</Text>
          )}
        </Animated.View>

        <View style={styles.cardsContainer}>
          {sortedExercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              index={i}
              isFavorite={favoriteSet.has(ex.id)}
              hapticsEnabled={state.hapticsEnabled}
              onToggleFavorite={() => toggleFavorite(ex.id)}
              onPress={() =>
                router.push({
                  pathname: '/exercise/[id]',
                  params: { id: ex.id },
                })
              }
            />
          ))}
        </View>

        {state.sessions.length > 0 && (
          <Animated.View entering={FadeIn.delay(600).duration(800)} style={styles.counterContainer}>
            <View style={styles.counterPill}>
              <Text style={styles.counterText}>
                {state.sessions.length} økt{state.sessions.length !== 1 ? 'er' : ''} fullført
                {state.longestStreak > 0 ? ` · rekord ${state.longestStreak} dager` : ''}
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
  loading: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  ambientGlow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.12,
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
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
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
    fontFamily: Typography.fontFamily.medium,
    fontSize: 42,
    color: Colors.textPrimary,
    letterSpacing: -2,
  },
  logoHead: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 42,
    color: Colors.greenAccent,
    letterSpacing: -2,
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  greetingHint: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.greenAccent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
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
    textAlign: 'center',
  },
});
