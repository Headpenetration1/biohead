import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Share, Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { exercises } from '@/constants/exercises';
import { AMBIENT_SOUNDSCAPE_OPTIONS } from '@/constants/ambientSounds';
import { useAppContext } from '@/context/AppContext';
import { getBestTimeBucket, getLast7DayTrend } from '@/utils/historyInsights';
import { toLocalDateKey } from '@/utils/formatTime';

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('nb-NO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

function formatClock(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAppContext();

  const grouped = useMemo(() => {
    const byDay = new Map<string, typeof state.sessions>();
    const sorted = [...state.sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    for (const s of sorted) {
      const day = toLocalDateKey(new Date(s.completedAt));
      const list = byDay.get(day) ?? [];
      list.push(s);
      byDay.set(day, list);
    }
    return Array.from(byDay.entries());
  }, [state.sessions]);

  const totalMinutes = useMemo(
    () => Math.round(state.sessions.reduce((acc, s) => acc + s.duration, 0) / 60),
    [state.sessions]
  );

  const exerciseCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of state.sessions) {
      m.set(s.exerciseId, (m.get(s.exerciseId) ?? 0) + 1);
    }
    return m;
  }, [state.sessions]);

  const topExercise = useMemo(() => {
    let maxId: string | null = null;
    let max = 0;
    exerciseCounts.forEach((n, id) => {
      if (n > max) {
        max = n;
        maxId = id;
      }
    });
    if (!maxId) return null;
    const ex = exercises.find((e) => e.id === maxId);
    return ex ? { title: ex.title, count: max } : null;
  }, [exerciseCounts]);

  const trend = useMemo(() => getLast7DayTrend(state.sessions), [state.sessions]);
  const bestTime = useMemo(() => getBestTimeBucket(state.sessions), [state.sessions]);
  const trendMax = useMemo(() => Math.max(1, ...trend.map((point) => point.minutes)), [trend]);
  const avgEffectScore = useMemo(() => {
    const scored = state.sessions.filter((entry) => typeof entry.effectScore === 'number');
    if (scored.length === 0) return null;
    const total = scored.reduce((acc, entry) => acc + (entry.effectScore ?? 0), 0);
    return total / scored.length;
  }, [state.sessions]);
  const avgStressDelta = useMemo(() => {
    const paired = state.sessions.filter(
      (entry) => typeof entry.effectScore === 'number' && typeof entry.stressBefore === 'number'
    );
    if (paired.length === 0) return null;
    const total = paired.reduce(
      (acc, entry) => acc + ((entry.stressBefore ?? 0) - (entry.effectScore ?? 0)),
      0
    );
    return total / paired.length;
  }, [state.sessions]);
  const bestEffectExercises = useMemo(() => {
    const scores = new Map<string, { total: number; count: number }>();
    for (const session of state.sessions) {
      if (typeof session.effectScore !== 'number') continue;
      const current = scores.get(session.exerciseId) ?? { total: 0, count: 0 };
      scores.set(session.exerciseId, { total: current.total + session.effectScore, count: current.count + 1 });
    }
    return [...scores.entries()]
      .map(([id, value]) => {
        const exercise = exercises.find((entry) => entry.id === id);
        if (!exercise) return null;
        return {
          id,
          title: exercise.title,
          avg: value.total / value.count,
          count: value.count,
        };
      })
      .filter((entry): entry is { id: string; title: string; avg: number; count: number } => entry != null)
      // effectScore now reflects "stress after session" where lower = calmer,
      // so the most effective exercises are the ones with the lowest average.
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3);
  }, [state.sessions]);
  const bestEffectSoundscape = useMemo(() => {
    const scores = new Map<string, { total: number; count: number }>();
    for (const session of state.sessions) {
      if (typeof session.effectScore !== 'number' || !session.ambientSoundscape) continue;
      const key = session.ambientSoundscape;
      const current = scores.get(key) ?? { total: 0, count: 0 };
      scores.set(key, { total: current.total + session.effectScore, count: current.count + 1 });
    }
    const best = [...scores.entries()]
      .map(([soundscape, value]) => ({
        soundscape,
        avg: value.total / value.count,
        count: value.count,
      }))
      // Lower score = calmer, so ascending sort picks the most effective soundscape.
      .sort((a, b) => a.avg - b.avg)[0];
    if (!best) return null;
    const label = AMBIENT_SOUNDSCAPE_OPTIONS.find((entry) => entry.id === best.soundscape)?.label ?? best.soundscape;
    return { ...best, label };
  }, [state.sessions]);

  const exportSessionsJson = useCallback(async () => {
    if (state.sessions.length === 0) return;

    const doShare = async () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        app: 'biohead',
        sessions: state.sessions,
      };
      const message = JSON.stringify(payload, null, 2);
      try {
        await Share.share({
          title: 'Biohead økter',
          message,
        });
      } catch {
        Alert.alert('Kunne ikke dele', 'Prøv igjen senere.');
      }
    };

    Alert.alert(
      'Eksporter øktlogg?',
      'Filen inneholder alle økter, datoer, varighet og stress-målinger. Del bare med noen du stoler på.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Del', style: 'default', onPress: () => void doShare() },
      ]
    );
  }, [state.sessions]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Tilbake"
          hitSlop={8}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Tilbake</Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.title}>Historikk</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{state.sessions.length}</Text>
          <Text style={styles.statLabel}>økter</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalMinutes}</Text>
          <Text style={styles.statLabel}>min totalt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{state.longestStreak}</Text>
          <Text style={styles.statLabel}>rekord-streak</Text>
        </View>
      </View>

      {topExercise ? (
        <Text style={styles.summary}>
          Mest brukt: <Text style={styles.summaryBold}>{topExercise.title}</Text> ({topExercise.count}{' '}
          økter)
        </Text>
      ) : (
        <Text style={styles.summary}>Fullfør en økt for å se statistikk her.</Text>
      )}

      {state.sessions.length > 0 ? (
        <Pressable
          onPress={exportSessionsJson}
          style={({ pressed }) => [styles.exportRow, pressed && styles.exportRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Eksporter øktlogg som tekst"
        >
          <Text style={styles.exportText}>Eksporter logg (JSON)</Text>
          <Text style={styles.exportArrow}>›</Text>
        </Pressable>
      ) : null}

      {state.sessions.length > 0 ? (
        <>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Siste 7 dager</Text>
            <View style={styles.trendRow}>
              {trend.map((point) => {
                const label = point.date.slice(5);
                const ratio = point.minutes / trendMax;
                return (
                  <View key={point.date} style={styles.trendItem}>
                    <View style={styles.trendTrack}>
                      <View style={[styles.trendFill, { height: `${Math.max(8, ratio * 100)}%` }]} />
                    </View>
                    <Text style={styles.trendValue}>{point.minutes}</Text>
                    <Text style={styles.trendLabel}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Beste tidspunkt</Text>
            <Text style={styles.insightBody}>
              {bestTime
                ? `${bestTime.bucket} (${bestTime.count} økter)`
                : 'Ingen data enda'}
            </Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Stress etter økt</Text>
            <Text style={styles.insightBody}>
              {avgEffectScore != null
                ? `${avgEffectScore.toFixed(1)}/5 i snitt`
                : 'Ingen måling enda'}
            </Text>
            {avgStressDelta != null ? (
              <Text style={styles.insightSub}>
                {avgStressDelta > 0
                  ? `Stresset faller i snitt med ${avgStressDelta.toFixed(1)} poeng`
                  : avgStressDelta < 0
                    ? `Stresset stiger i snitt med ${Math.abs(avgStressDelta).toFixed(1)} poeng`
                    : 'Samme stressnivå i snitt'}
              </Text>
            ) : null}
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Mest beroligende øvelser</Text>
            {bestEffectExercises.length === 0 ? (
              <Text style={styles.insightSub}>Logg stress etter økter for å få innsikt.</Text>
            ) : (
              bestEffectExercises.map((entry) => (
                <Text key={entry.id} style={styles.insightSub}>
                  {entry.title}: {entry.avg.toFixed(1)}/5 stress i snitt ({entry.count} økter)
                </Text>
              ))
            )}
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Mest beroligende miks</Text>
            <Text style={styles.insightBody}>
              {bestEffectSoundscape
                ? `${bestEffectSoundscape.label} (${bestEffectSoundscape.avg.toFixed(1)}/5 stress i snitt)`
                : 'Ingen ambient-data enda'}
            </Text>
            {bestEffectSoundscape ? (
              <Text style={styles.insightSub}>{bestEffectSoundscape.count} økter med måling</Text>
            ) : null}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionLabel}>Logg</Text>
      {grouped.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji} accessibilityElementsHidden>🌱</Text>
          <Text style={styles.emptyTitle}>Ingen økter ennå</Text>
          <Text style={styles.emptyBody}>
            Når du fullfører en pusteøkt dukker den opp her med trender og dags-grupperinger.
          </Text>
          <Pressable
            onPress={() => router.replace('/' as Href)}
            style={styles.emptyCta}
            accessibilityRole="button"
            accessibilityLabel="Gå til forsiden og start en økt"
          >
            <Text style={styles.emptyCtaText}>Start første økt</Text>
          </Pressable>
        </View>
      ) : (
        grouped.map(([day, sessions]) => (
          <View key={day} style={styles.dayBlock}>
            <Text style={styles.dayTitle}>
              {formatShortDate(sessions[0].completedAt)}
            </Text>
            {sessions.map((s) => {
              const ex = exercises.find((e) => e.id === s.exerciseId);
              return (
                <View key={s.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.exTitle}>{ex?.title ?? s.exerciseId}</Text>
                    <Text style={styles.exSub}>
                      {s.duration}s · {formatClock(s.completedAt)}
                    </Text>
                  </View>
                  <View style={[styles.dot, { backgroundColor: ex?.glowColor ?? Colors.textMuted }]} />
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(14,32,37,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.05)',
    marginBottom: 24,
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
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.textPrimary,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(14,32,37,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.06)',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.xl,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summary: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  summaryBold: {
    color: Colors.greenAccent,
    fontFamily: Typography.fontFamily.bold,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(14,32,37,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
  },
  exportRowPressed: {
    opacity: 0.85,
  },
  exportText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.base,
    color: Colors.greenAccent,
  },
  exportArrow: {
    fontSize: 22,
    color: Colors.textMuted,
  },
  insightCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    backgroundColor: 'rgba(14,32,37,0.04)',
    padding: 12,
    marginBottom: 12,
  },
  insightTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  insightBody: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.textPrimary,
  },
  insightSub: {
    marginTop: 4,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  trendItem: {
    flex: 1,
    alignItems: 'center',
  },
  trendTrack: {
    height: 56,
    width: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(14,32,37,0.12)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  trendFill: {
    width: '100%',
    borderRadius: 99,
    backgroundColor: Colors.greenAccent,
  },
  trendValue: {
    marginTop: 6,
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  trendLabel: {
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  empty: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
  emptyCard: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    backgroundColor: 'rgba(14,32,37,0.03)',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.textPrimary,
  },
  emptyBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyCta: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: `${Colors.greenAccent}22`,
    borderColor: `${Colors.greenAccent}66`,
    borderWidth: 1,
  },
  emptyCtaText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.greenAccent,
  },
  dayBlock: {
    marginBottom: 20,
  },
  dayTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(14,32,37,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.05)',
    marginBottom: 8,
  },
  rowLeft: {
    flex: 1,
  },
  exTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  exSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
  },
});
