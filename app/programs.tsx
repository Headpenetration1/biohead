import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { PROGRAMS } from '@/constants/programs';
import { exercises } from '@/constants/exercises';
import { useAppContext } from '@/context/AppContext';

export default function ProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, startProgram } = useAppContext();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backArrow}>‹</Text>
        <Text style={styles.backText}>Tilbake</Text>
      </Pressable>

      <Text style={styles.title}>Programmer</Text>
      <Text style={styles.sub}>
        Velg et opplegg. Fullfør dagens øvelse for å låse opp neste dag.
      </Text>

      <View style={styles.list}>
        {PROGRAMS.map((program) => {
          const active = state.activeProgram?.id === program.id;
          const progress = active
            ? `${state.activeProgram?.completedDays ?? 0}/${program.days.length}`
            : `0/${program.days.length}`;
          const currentDay = active ? state.activeProgram?.currentDay ?? 1 : 1;
          const day = program.days[Math.max(0, Math.min(program.days.length - 1, currentDay - 1))];
          const ex = exercises.find((entry) => entry.id === day.exerciseId);
          return (
            <View key={program.id} style={[styles.card, active && styles.cardActive]}>
              <Text style={styles.cardTitle}>{program.title}</Text>
              <Text style={styles.cardSub}>{program.subtitle}</Text>
              <Text style={styles.cardDesc}>{program.description}</Text>
              <Text style={styles.cardMeta}>
                Dag {day.day}: {ex?.title ?? day.exerciseId} · {day.duration}s · {day.label}
              </Text>
              <View style={styles.row}>
                <Text style={styles.progress}>Progress: {progress}</Text>
                <Pressable
                  onPress={() => {
                    startProgram(program.id);
                    router.replace('/' as Href);
                  }}
                  style={styles.startBtn}
                >
                  <Text style={styles.startBtnText}>{active ? 'Start på nytt' : 'Start'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
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
    backgroundColor: 'rgba(14,32,37,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.05)',
    marginBottom: 18,
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
  },
  sub: {
    marginTop: 10,
    marginBottom: 20,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  list: {
    gap: 14,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    backgroundColor: 'rgba(14,32,37,0.04)',
    padding: 14,
    gap: 8,
  },
  cardActive: {
    borderColor: `${Colors.greenAccent}66`,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.greenAccent,
  },
  cardDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  cardMeta: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
  row: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progress: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  startBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: `${Colors.greenAccent}20`,
    borderColor: `${Colors.greenAccent}66`,
    borderWidth: 1,
  },
  startBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.greenAccent,
  },
});
