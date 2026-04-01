import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useAppContext } from '@/context/AppContext';
import HapticButton from '@/components/HapticButton';
import type { ProgramId } from '@/constants/programs';

const GOALS = [
  { id: 'calm' as const, title: 'Ro og nedstemthet', subtitle: 'Senke stress og finne ro' },
  { id: 'focus' as const, title: 'Fokus og klarhet', subtitle: 'Skjerpe konsentrasjonen' },
  { id: 'energy' as const, title: 'Energi og oppladning', subtitle: 'Løfte energinivået' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAppContext();
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<'calm' | 'focus' | 'energy' | null>(null);
  const [stressLevel, setStressLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [focusNeed, setFocusNeed] = useState(3);

  const computedGoal: 'calm' | 'focus' | 'energy' = (() => {
    if (stressLevel >= 4 || sleepQuality <= 2) return 'calm';
    if (focusNeed >= 4) return 'focus';
    return 'energy';
  })();
  const finalGoal = selectedGoal ?? computedGoal;
  const starterProgramId: ProgramId = (() => {
    if (sleepQuality <= 2) return 'sleep7';
    if (finalGoal === 'focus') return 'focus7';
    return 'calm7';
  })();

  const finish = () => {
    completeOnboarding({
      goal: finalGoal,
      profile: { stressLevel, sleepQuality, focusNeed },
      starterProgramId,
    });
    router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      {step === 0 && (
        <Animated.View entering={FadeIn.duration(500)} style={styles.section}>
          <Text style={styles.kicker}>Velkommen</Text>
          <Text style={styles.title}>Biohead</Text>
          <Text style={styles.body}>
            Korte, guidede pusteøvelser for ro, fokus og energi – når du trenger det.
          </Text>
          <HapticButton title="Fortsett" onPress={() => setStep(1)} style={styles.cta} />
        </Animated.View>
      )}

      {step === 1 && (
        <Animated.View entering={FadeInDown.duration(450)} style={styles.section}>
          <Text style={styles.kicker}>Steg 2 av 4</Text>
          <Text style={styles.title}>Hva trenger du mest?</Text>
          <Text style={styles.body}>Vi tilpasser forsiden etter valget ditt (du kan endre det senere).</Text>
          <View style={styles.goalList}>
            {GOALS.map((g) => {
              const active = selectedGoal === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setSelectedGoal(g.id)}
                  style={[styles.goalCard, active && styles.goalCardActive]}
                >
                  <Text style={[styles.goalTitle, active && styles.goalTitleActive]}>{g.title}</Text>
                  <Text style={styles.goalSub}>{g.subtitle}</Text>
                </Pressable>
              );
            })}
          </View>
          <HapticButton
            title="Neste"
            onPress={() => setStep(2)}
            style={styles.cta}
            variant={selectedGoal ? 'primary' : 'secondary'}
          />
        </Animated.View>
      )}

      {step === 2 && (
        <Animated.View entering={FadeInDown.duration(450)} style={styles.section}>
          <Text style={styles.kicker}>Steg 3 av 4</Text>
          <Text style={styles.title}>Rask stress-sjekk</Text>
          <Text style={styles.body}>Dette hjelper oss foresla rett oppstartsplan for deg.</Text>
          <View style={styles.quizGroup}>
            <Text style={styles.quizLabel}>Stress nå (1-5)</Text>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={`stress-${value}`}
                  onPress={() => setStressLevel(value)}
                  style={[styles.scaleChip, stressLevel === value && styles.scaleChipActive]}
                >
                  <Text style={[styles.scaleChipText, stressLevel === value && styles.scaleChipTextActive]}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.quizLabel}>Søvnkvalitet i natt (1-5)</Text>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={`sleep-${value}`}
                  onPress={() => setSleepQuality(value)}
                  style={[styles.scaleChip, sleepQuality === value && styles.scaleChipActive]}
                >
                  <Text style={[styles.scaleChipText, sleepQuality === value && styles.scaleChipTextActive]}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.quizLabel}>Behov for fokus i dag (1-5)</Text>
            <View style={styles.scaleRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={`focus-${value}`}
                  onPress={() => setFocusNeed(value)}
                  style={[styles.scaleChip, focusNeed === value && styles.scaleChipActive]}
                >
                  <Text style={[styles.scaleChipText, focusNeed === value && styles.scaleChipTextActive]}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <HapticButton title="Se anbefaling" onPress={() => setStep(3)} style={styles.cta} />
        </Animated.View>
      )}

      {step === 3 && (
        <Animated.View entering={FadeInDown.duration(450)} style={styles.section}>
          <Text style={styles.kicker}>Steg 4 av 4</Text>
          <Text style={styles.title}>Du er klar</Text>
          <Text style={styles.body}>
            Startforslag: <Text style={styles.recoInline}>{finalGoal}</Text> + program{' '}
            <Text style={styles.recoInline}>{starterProgramId}</Text>.
            {'\n\n'}
            Finn et rolig øyeblikk, velg en øvelse, og følg sirkelen. Alt lagres lokalt på enheten.
          </Text>
          <Text style={styles.disclaimer}>
            Biohead erstatter ikke profesjonell helsehjelp ved behov for behandling eller råd.
          </Text>
          <HapticButton title="Start Biohead" onPress={finish} style={styles.cta} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBase,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  section: {
    gap: 20,
  },
  kicker: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.greenAccent,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  disclaimer: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  cta: {
    width: '100%',
    marginTop: 12,
  },
  goalList: {
    gap: 12,
  },
  goalCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    backgroundColor: 'rgba(14,32,37,0.03)',
  },
  goalCardActive: {
    borderColor: `${Colors.greenAccent}80`,
    backgroundColor: `${Colors.greenAccent}12`,
  },
  goalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  goalTitleActive: {
    color: Colors.greenAccent,
  },
  goalSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  quizGroup: {
    gap: 12,
  },
  quizLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scaleChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleChipActive: {
    borderColor: `${Colors.greenAccent}88`,
    backgroundColor: `${Colors.greenAccent}20`,
  },
  scaleChipText: {
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  scaleChipTextActive: {
    color: Colors.greenAccent,
  },
  recoInline: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.greenAccent,
  },
});
