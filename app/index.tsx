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
import { useHaptics } from '@/hooks/useHaptics';
import { getAdaptiveRecommendation } from '@/utils/recommendation';
import {
  getProgressionLevel,
  getTotalMinutes,
  getWeekMinutes,
} from '@/utils/progression';
import ExerciseCard from '@/components/ExerciseCard';
import StreakBadge from '@/components/StreakBadge';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, toggleFavorite } = useAppContext();
  const { light: hapticLight } = useHaptics(state.hapticsEnabled);

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

  const favoriteExercises = useMemo(() => {
    return state.favorites
      .map((fid) => exercises.find((e) => e.id === fid))
      .filter((e): e is (typeof exercises)[number] => e != null);
  }, [state.favorites]);

  const mainExercises = useMemo(() => {
    if (state.favorites.length === 0) return sortedExercises;
    return sortedExercises.filter((e) => !favoriteSet.has(e.id));
  }, [sortedExercises, favoriteSet, state.favorites.length]);

  const recommended = useMemo(() => {
    const rec = getAdaptiveRecommendation({
      sessions: state.sessions,
      exercises,
      goal: state.userGoal,
    });
    if (!rec) return null;
    const exercise = exercises.find((entry) => entry.id === rec.exerciseId);
    if (!exercise) return null;
    return { ...rec, exercise };
  }, [state.sessions, state.userGoal]);

  const lastSessionExercise = useMemo(() => {
    if (state.sessions.length === 0) return null;
    const last = state.sessions[state.sessions.length - 1];
    return exercises.find((e) => e.id === last.exerciseId) ?? null;
  }, [state.sessions]);

  const weekMinutes = useMemo(() => getWeekMinutes(state.sessions), [state.sessions]);
  const totalMinutes = useMemo(() => getTotalMinutes(state.sessions), [state.sessions]);
  const progression = useMemo(() => getProgressionLevel(totalMinutes), [totalMinutes]);
  const weeklyCompletion = Math.min(weekMinutes / Math.max(1, state.weeklyGoalMinutes), 1);

  const showMainHeading = favoriteExercises.length > 0 && mainExercises.length > 0;
  const mainCardIndexOffset = favoriteExercises.length;

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

        {recommended ? (
          <Animated.View entering={FadeInDown.delay(165).duration(500).springify()} style={styles.recoWrap}>
            <Pressable
              onPress={() => {
                hapticLight();
                router.push({
                  pathname: '/exercise/[id]',
                  params: { id: recommended.exercise.id },
                });
              }}
              style={({ pressed }) => [
                styles.recoCard,
                { borderColor: `${recommended.exercise.glowColor}55` },
                pressed && styles.resumeCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Anbefalt nå: ${recommended.exercise.title}`}
            >
              <Text style={styles.recoKicker}>Anbefalt nå</Text>
              <Text style={[styles.recoTitle, { color: recommended.exercise.glowColor }]}>
                {recommended.exercise.title}
              </Text>
              <Text style={styles.recoSub}>{recommended.reason}</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {lastSessionExercise ? (
          <Animated.View entering={FadeInDown.delay(180).duration(500).springify()} style={styles.resumeWrap}>
            <Pressable
              onPress={() => {
                hapticLight();
                router.push({
                  pathname: '/exercise/[id]',
                  params: { id: lastSessionExercise.id },
                });
              }}
              style={({ pressed }) => [
                styles.resumeCard,
                { borderColor: `${lastSessionExercise.glowColor}55` },
                pressed && styles.resumeCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Fortsett med ${lastSessionExercise.title}`}
            >
              <Text style={styles.resumeKicker}>Sist du brukte</Text>
              <Text style={[styles.resumeTitle, { color: lastSessionExercise.glowColor }]}>
                {lastSessionExercise.title}
              </Text>
              <Text style={styles.resumeSub}>Åpne øvelsen · varighet som du har valgt</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(210).duration(500).springify()} style={styles.progressWrap}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressTitle}>Ukesmål</Text>
              <Text style={styles.progressBadge}>Nivå {progression.level}</Text>
            </View>
            <Text style={styles.progressSub}>
              {weekMinutes}/{state.weeklyGoalMinutes} min denne uken
              {progression.nextTarget
                ? ` · neste nivå ved ${progression.nextTarget} min totalt`
                : ' · toppnivå nådd'}
            </Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${weeklyCompletion * 100}%` }]} />
            </View>
          </View>
        </Animated.View>

        {favoriteExercises.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>Favoritter</Text>
            <View style={[styles.cardsContainer, styles.sectionBlock]}>
              {favoriteExercises.map((ex, i) => (
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
          </>
        ) : null}

        {showMainHeading ? (
          <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]}>Alle øvelser</Text>
        ) : null}

        <View style={styles.cardsContainer}>
          {mainExercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              index={mainCardIndexOffset + i}
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
    marginBottom: 20,
  },
  recoWrap: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  recoCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  recoKicker: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  recoTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    marginBottom: 4,
  },
  recoSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  resumeWrap: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  resumeCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  resumeCardPressed: {
    opacity: 0.88,
  },
  resumeKicker: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  resumeTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    marginBottom: 4,
  },
  resumeSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  progressWrap: {
    alignSelf: 'stretch',
    marginBottom: 28,
  },
  progressCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressBadge: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.greenAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.greenAccent,
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
  sectionHeading: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  sectionHeadingSpaced: {
    marginTop: 8,
  },
  sectionBlock: {
    marginBottom: 8,
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
