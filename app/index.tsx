import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, Pressable, Share, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Redirect, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { History, Settings, Volume2 } from 'lucide-react-native';
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
import { getProgramById } from '@/constants/programs';
import { useAppContext } from '@/context/AppContext';
import { useHaptics } from '@/hooks/useHaptics';
import { getAdaptiveRecommendation } from '@/utils/recommendation';
import { getFreshStressCheck } from '@/utils/stressCheck';
import {
  getProgressionLevel,
  getTotalMinutes,
  getWeekSessionCount,
  getWeekMinutes,
} from '@/utils/progression';
import { formatDurationAccessible, formatDurationShort } from '@/utils/formatTime';
import ExerciseCard from '@/components/ExerciseCard';
import StreakBadge from '@/components/StreakBadge';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, toggleFavorite, setWidgetSnapshot, setStressCheck, deleteSessionSetup } = useAppContext();
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
  const freshStressCheck = useMemo(
    () => getFreshStressCheck(state.stressCheck),
    [state.stressCheck]
  );

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
      stressLevel: freshStressCheck?.level,
      onboardingProfile: state.onboardingProfile,
    });
    if (!rec) return null;
    const exercise = exercises.find((entry) => entry.id === rec.exerciseId);
    if (!exercise) return null;
    return { ...rec, exercise };
  }, [state.sessions, state.userGoal, freshStressCheck?.level, state.onboardingProfile]);

  const lastSessionExercise = useMemo(() => {
    if (state.sessions.length === 0) return null;
    const last = state.sessions[state.sessions.length - 1];
    return exercises.find((e) => e.id === last.exerciseId) ?? null;
  }, [state.sessions]);

  const weekMinutes = useMemo(() => getWeekMinutes(state.sessions), [state.sessions]);
  const weekSessions = useMemo(() => getWeekSessionCount(state.sessions), [state.sessions]);
  const totalMinutes = useMemo(() => getTotalMinutes(state.sessions), [state.sessions]);
  const progression = useMemo(() => getProgressionLevel(totalMinutes), [totalMinutes]);
  const weeklyCompletion = Math.min(weekMinutes / Math.max(1, state.weeklyGoalMinutes), 1);
  const weeklySessionCompletion = Math.min(weekSessions / Math.max(1, state.weeklySessionGoal), 1);
  const activeProgram = useMemo(() => getProgramById(state.activeProgram?.id), [state.activeProgram?.id]);
  const activeProgramDay = useMemo(() => {
    if (!activeProgram || !state.activeProgram) return undefined;
    return activeProgram.days[state.activeProgram.currentDay - 1];
  }, [activeProgram, state.activeProgram]);
  const isKickstartProgram = useMemo(() => {
    const id = state.activeProgram?.id;
    return id === 'calm3' || id === 'focus3' || id === 'energy3' || id === 'sleep3';
  }, [state.activeProgram?.id]);
  const savedSessions = useMemo(
    () =>
      state.savedSessions
        .map((setup) => {
          const exercise = exercises.find((entry) => entry.id === setup.exerciseId);
          if (!exercise) return null;
          return { ...setup, exercise };
        })
        .filter(
          (entry): entry is (typeof state.savedSessions)[number] & { exercise: (typeof exercises)[number] } =>
            entry != null
        ),
    [state.savedSessions]
  );

  useEffect(() => {
    setWidgetSnapshot({
      recommendedExerciseId: recommended?.exercise.id,
      lastSessionExerciseId: lastSessionExercise?.id,
    });
  }, [recommended?.exercise.id, lastSessionExercise?.id, setWidgetSnapshot]);

  const showMainHeading = favoriteExercises.length > 0 && mainExercises.length > 0;
  const mainCardIndexOffset = favoriteExercises.length;

  if (state.isLoading) {
    return (
      <View
        style={[styles.container, styles.loading]}
        accessibilityRole="progressbar"
        accessibilityLabel="Laster Biohead"
      >
        <ActivityIndicator color={Colors.greenAccent} />
        <Text style={styles.loadingText}>Laster …</Text>
      </View>
    );
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
            <Settings size={21} color={Colors.textSecondary} strokeWidth={1.8} />
          </Pressable>
          <StreakBadge count={state.currentStreak} />
          <Pressable
            onPress={() => router.push('/history' as Href)}
            style={styles.headerIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Historikk"
          >
            <History size={21} color={Colors.textSecondary} strokeWidth={1.8} />
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          style={styles.logoContainer}
        >
          <Image source={require('@/assets/logo-transparent.png')} style={styles.logoFace} />
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

        {activeProgram && state.activeProgram && activeProgramDay ? (
          <Animated.View entering={FadeInDown.delay(155).duration(500).springify()} style={styles.todayPlanWrap}>
            <View style={styles.todayPlanCard}>
              <View style={styles.todayPlanHeader}>
                <Text style={styles.todayPlanKicker}>Dagens plan</Text>
                <Text style={styles.todayPlanBadge}>
                  Dag {state.activeProgram.currentDay}/{activeProgram.days.length}
                  {isKickstartProgram ? ' kickstart' : ''}
                </Text>
              </View>
              <Text style={styles.todayPlanTitle}>{activeProgramDay.label}</Text>
              <Text style={styles.todayPlanSub}>
                {exercises.find((entry) => entry.id === activeProgramDay.exerciseId)?.title ?? activeProgramDay.exerciseId}
                {' · '}
                {formatDurationShort(activeProgramDay.duration)}
              </Text>
              <View style={styles.todayPlanActions}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/exercise/session',
                      params: {
                        id: activeProgramDay.exerciseId,
                        duration: String(activeProgramDay.duration),
                        stress:
                          freshStressCheck?.level != null
                            ? String(freshStressCheck.level)
                            : undefined,
                        programId: activeProgram.id,
                        programDay: String(activeProgramDay.day),
                      },
                    })
                  }
                  style={styles.todayPlanPrimaryBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Start dag ${activeProgramDay.day} i programmet, ${formatDurationAccessible(activeProgramDay.duration)}`}
                >
                  <Text style={styles.todayPlanPrimaryBtnText}>Start dagens øvelse</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/programs' as Href)}
                  style={styles.todayPlanSecondaryBtn}
                >
                  <Text style={styles.todayPlanSecondaryBtnText}>Bytt program</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(160).duration(500).springify()} style={styles.soundQuickWrap}>
          <Pressable
            onPress={() => router.push('/lydmikser' as Href)}
            style={styles.soundQuickBtn}
            accessibilityRole="button"
            accessibilityLabel="Åpne Lydmikser"
          >
            <View style={styles.soundQuickTitleRow}>
              <Volume2 size={18} color={Colors.textPrimary} strokeWidth={1.8} />
              <Text style={styles.soundQuickTitle}>Lydmikser</Text>
            </View>
            <Text style={styles.soundQuickSub}>Juster miks, forhåndslytt og bruk lagrede lydprofiler</Text>
          </Pressable>
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

        <Animated.View entering={FadeInDown.delay(170).duration(500).springify()} style={styles.stressWrap}>
          <View style={styles.stressCard}>
            <Text style={styles.stressTitle}>Stress-sjekk før økt</Text>
            <Text style={styles.stressSub}>Hvordan føles kroppen akkurat nå?</Text>
            <View style={styles.stressLevels}>
              {[1, 2, 3, 4, 5].map((level) => {
                const active = freshStressCheck?.level === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setStressCheck(level)}
                    style={[styles.stressChip, active && styles.stressChipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Stressnivå ${level} av 5`}
                    hitSlop={8}
                  >
                    <Text style={[styles.stressChipText, active && styles.stressChipTextActive]}>{level}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>

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

        {savedSessions.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(190).duration(500).springify()} style={styles.savedWrap}>
            <Text style={styles.sectionHeading}>Lagrede økter</Text>
            <View style={styles.savedList}>
              {savedSessions.map((setup) => (
                <View key={setup.id} style={styles.savedCard}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/exercise/session',
                        params: {
                          id: setup.exercise.id,
                          duration: String(setup.duration),
                          stress: setup.stressLevel != null ? String(setup.stressLevel) : undefined,
                        },
                      })
                    }
                    style={styles.savedMain}
                    accessibilityRole="button"
                    accessibilityLabel={`Start lagret økt ${setup.name}`}
                  >
                    <Text style={styles.savedName}>{setup.name}</Text>
                    <Text style={styles.savedSub}>
                      {setup.exercise.title} · {formatDurationShort(setup.duration)}
                      {setup.stressLevel != null ? ` · stress ${setup.stressLevel}/5` : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteSessionSetup(setup.id)}
                    style={styles.savedDelete}
                    accessibilityRole="button"
                    accessibilityLabel={`Slett lagret økt ${setup.name}`}
                  >
                    <Text style={styles.savedDeleteText}>Slett</Text>
                  </Pressable>
                </View>
              ))}
            </View>
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
            <Text style={styles.progressSub}>
              {weekSessions}/{state.weeklySessionGoal} økter denne uken
            </Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFillSecondary,
                  { width: `${weeklySessionCompletion * 100}%` },
                ]}
              />
            </View>
          </View>
        </Animated.View>

        {!activeProgram || !state.activeProgram || !activeProgramDay ? (
          <Animated.View entering={FadeInDown.delay(230).duration(500).springify()} style={styles.programWrap}>
            <Pressable onPress={() => router.push('/programs' as Href)} style={styles.programCard}>
              <Text style={styles.programTitle}>Guidede programmer</Text>
              <Text style={styles.programSub}>Start et program og bygg vane dag for dag.</Text>
            </Pressable>
          </Animated.View>
        ) : null}

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
            <Pressable
              onPress={async () => {
                try {
                  await Share.share({
                    title: 'Biohead milepæl',
                    message: `Jeg har fullført ${state.sessions.length} Biohead-økter, ${totalMinutes} minutter totalt, og er på nivå ${progression.level}.`,
                  });
                } catch {
                  Alert.alert('Kunne ikke dele', 'Prøv igjen om et øyeblikk.');
                }
              }}
              style={styles.shareMilestoneBtn}
              accessibilityRole="button"
              accessibilityLabel="Del milepæl"
            >
              <Text style={styles.shareMilestoneText}>Del milepæl</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
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
    backgroundColor: 'rgba(14,32,37,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.06)',
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
    color: Colors.greenAccent,
    letterSpacing: -2,
  },
  logoHead: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 42,
    color: Colors.textPrimary,
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
  soundQuickWrap: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  soundQuickBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(14,32,37,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
  },
  soundQuickTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  soundQuickTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  soundQuickSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  recoCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(14,32,37,0.04)',
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
  stressWrap: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  stressCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(14,32,37,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    gap: 8,
  },
  stressTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stressSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  stressLevels: {
    flexDirection: 'row',
    gap: 8,
  },
  stressChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stressChipActive: {
    borderColor: `${Colors.greenAccent}88`,
    backgroundColor: `${Colors.greenAccent}20`,
  },
  stressChipText: {
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  stressChipTextActive: {
    color: Colors.greenAccent,
  },
  savedWrap: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  savedList: {
    gap: 8,
  },
  savedCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    backgroundColor: 'rgba(14,32,37,0.04)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedMain: {
    flex: 1,
  },
  savedName: {
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  savedSub: {
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  savedDelete: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(14,32,37,0.08)',
  },
  savedDeleteText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resumeWrap: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  resumeCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(14,32,37,0.04)',
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
    marginBottom: 14,
  },
  progressCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(14,32,37,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
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
    backgroundColor: 'rgba(14,32,37,0.12)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.greenAccent,
  },
  progressBarFillSecondary: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: `${Colors.focusGlow}CC`,
  },
  programWrap: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  programCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(14,32,37,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    gap: 10,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  programTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  programBadge: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.greenAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  programSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  programActions: {
    flexDirection: 'row',
    gap: 8,
  },
  programBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.greenAccent}66`,
    backgroundColor: `${Colors.greenAccent}18`,
    alignItems: 'center',
  },
  programBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.greenAccent,
  },
  programBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.1)',
    backgroundColor: 'rgba(14,32,37,0.05)',
    alignItems: 'center',
  },
  programBtnSecondaryText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
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
  todayPlanWrap: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  todayPlanCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: `${Colors.greenAccent}12`,
    borderWidth: 1,
    borderColor: `${Colors.greenAccent}50`,
    gap: 8,
  },
  todayPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  todayPlanKicker: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  todayPlanBadge: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.greenAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  todayPlanTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  todayPlanSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  todayPlanActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  todayPlanPrimaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.greenAccent}66`,
    backgroundColor: `${Colors.greenAccent}22`,
    alignItems: 'center',
  },
  todayPlanPrimaryBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.greenAccent,
  },
  todayPlanSecondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.1)',
    backgroundColor: 'rgba(14,32,37,0.05)',
    alignItems: 'center',
  },
  todayPlanSecondaryBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
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
    gap: 10,
  },
  counterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(14,32,37,0.03)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.05)',
  },
  counterText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  shareMilestoneBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: `${Colors.greenAccent}66`,
    backgroundColor: `${Colors.greenAccent}18`,
  },
  shareMilestoneText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.greenAccent,
  },
});
