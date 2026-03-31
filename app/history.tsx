import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { exercises } from '@/constants/exercises';
import { useAppContext } from '@/context/AppContext';

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
      const day = s.completedAt.split('T')[0];
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
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

      <Text style={styles.sectionLabel}>Logg</Text>
      {grouped.length === 0 ? (
        <Text style={styles.empty}>Ingen økter ennå.</Text>
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
    backgroundColor: Colors.darkBase,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
