import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useAppContext } from '@/context/AppContext';
import type { ReminderTime } from '@/utils/storage';
import { requestNotificationPermission } from '@/utils/reminders';
import { requestHealthKitMindfulAccess } from '@/utils/appleHealthMindful';

const REMINDER_PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: '08:00', hour: 8, minute: 0 },
  { label: '09:00', hour: 9, minute: 0 },
  { label: '12:00', hour: 12, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '21:00', hour: 21, minute: 0 },
];

const WEEKLY_GOAL_PRESETS = [20, 40, 60, 90] as const;
const WEEKLY_SESSION_GOAL_PRESETS = [3, 5, 7, 10] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    state,
    updatePreferences,
    resetData,
  } = useAppContext();

  const isReminderSelected = useCallback(
    (target: ReminderTime) =>
      state.reminderTimes.some(
        (time) => time.hour === target.hour && time.minute === target.minute
      ),
    [state.reminderTimes]
  );

  const toggleReminderPreset = useCallback(
    (target: ReminderTime) => {
      const currentlySelected = isReminderSelected(target);
      const next = currentlySelected
        ? state.reminderTimes.filter(
            (time) => !(time.hour === target.hour && time.minute === target.minute)
          )
        : [...state.reminderTimes, target];

      const fallback = [{ hour: target.hour, minute: target.minute }];
      updatePreferences({ reminderTimes: next.length > 0 ? next : fallback });
    },
    [isReminderSelected, state.reminderTimes, updatePreferences]
  );

  const onHealthSyncToggle = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        updatePreferences({ healthSyncEnabled: false });
        return;
      }
      const ok = await requestHealthKitMindfulAccess();
      if (!ok) {
        Alert.alert(
          'Apple Helse',
          'Biohead trenger tillatelse for å skrive mindful minutes. Sjekk Helse-appen under Innstillinger hvis du tidligere avslo.'
        );
        return;
      }
      updatePreferences({ healthSyncEnabled: true });
    },
    [updatePreferences]
  );

  const onReminderToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const ok = await requestNotificationPermission();
        if (!ok) {
          Alert.alert(
            'Tillatelse',
            'Aktiver varsler for Biohead i systeminnstillingene for å få daglig påminnelse.'
          );
          return;
        }
      }
      updatePreferences({ reminderEnabled: enabled });
    },
    [updatePreferences]
  );

  const confirmReset = () => {
    Alert.alert(
      'Nullstille data?',
      'Streak, historikk og innstillinger slettes fra denne enheten.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Nullstill',
          style: 'destructive',
          onPress: () => {
            resetData();
            router.replace('/');
          },
        },
      ]
    );
  };

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

      <Text style={styles.title}>Innstillinger</Text>

      <Text style={styles.sectionLabel}>Økt</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Haptikk</Text>
            <Text style={styles.rowSub}>Vibrasjon ved trykk og pustefaser</Text>
          </View>
          <Switch
            value={state.hapticsEnabled}
            onValueChange={(v) => updatePreferences({ hapticsEnabled: v })}
            trackColor={{ false: '#333', true: `${Colors.greenAccent}88` }}
            thumbColor={state.hapticsEnabled ? Colors.greenAccent : '#888'}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Reduser bevegelse</Text>
            <Text style={styles.rowSub}>Enklere animasjoner i økter</Text>
          </View>
          <Switch
            value={state.reduceMotion}
            onValueChange={(v) => updatePreferences({ reduceMotion: v })}
            trackColor={{ false: '#333', true: `${Colors.greenAccent}88` }}
            thumbColor={state.reduceMotion ? Colors.greenAccent : '#888'}
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Lyd</Text>
      <View style={styles.card}>
        <Pressable onPress={() => router.push('/lydmikser')} style={styles.linkRow}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>🔊 Åpne Lydmikser</Text>
            <Text style={styles.rowSub}>Velg modus, forhåndslytt og lagre mikser</Text>
          </View>
          <Text style={styles.linkArrow}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Påminnelse</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Daglig påminnelse</Text>
            <Text style={styles.rowSub}>Lokalt varsel på telefonen</Text>
          </View>
          <Switch
            value={state.reminderEnabled}
            onValueChange={onReminderToggle}
            trackColor={{ false: '#333', true: `${Colors.greenAccent}88` }}
            thumbColor={state.reminderEnabled ? Colors.greenAccent : '#888'}
          />
        </View>
        {state.reminderEnabled ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.presetLabel}>Tidspunkter (du kan velge flere)</Text>
            <View style={styles.presetRow}>
              {REMINDER_PRESETS.map((p) => {
                const active = isReminderSelected(p);
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => toggleReminderPreset(p)}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                  >
                    <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Stille helg</Text>
                <Text style={styles.rowSub}>Sender bare påminnelser mandag–fredag</Text>
              </View>
              <Switch
                value={state.reminderQuietWeekends}
                onValueChange={(v) => updatePreferences({ reminderQuietWeekends: v })}
                trackColor={{ false: '#333', true: `${Colors.greenAccent}88` }}
                thumbColor={state.reminderQuietWeekends ? Colors.greenAccent : '#888'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Adaptive tidspunkt</Text>
                <Text style={styles.rowSub}>
                  Foreslår påminnelser basert på når du vanligvis gjennomfører økter
                </Text>
              </View>
              <Switch
                value={state.reminderAdaptiveEnabled}
                onValueChange={(v) => updatePreferences({ reminderAdaptiveEnabled: v })}
                trackColor={{ false: '#333', true: `${Colors.greenAccent}88` }}
                thumbColor={state.reminderAdaptiveEnabled ? Colors.greenAccent : '#888'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Smart skip</Text>
                <Text style={styles.rowSub}>
                  Hopper over varsler resten av dagen når du allerede har fullført en økt
                </Text>
              </View>
              <Switch
                value={state.reminderSkipIfDoneToday}
                onValueChange={(v) => updatePreferences({ reminderSkipIfDoneToday: v })}
                trackColor={{ false: '#333', true: `${Colors.greenAccent}88` }}
                thumbColor={state.reminderSkipIfDoneToday ? Colors.greenAccent : '#888'}
              />
            </View>
          </>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>Progresjon</Text>
      <View style={styles.card}>
        <Text style={styles.presetLabel}>Ukesmål (minutter)</Text>
        <View style={styles.presetRow}>
          {WEEKLY_GOAL_PRESETS.map((goal) => {
            const active = state.weeklyGoalMinutes === goal;
            return (
              <Pressable
                key={String(goal)}
                onPress={() => updatePreferences({ weeklyGoalMinutes: goal })}
                style={[styles.presetChip, active && styles.presetChipActive]}
              >
                <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                  {goal} min
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.divider} />
        <Text style={styles.presetLabel}>Ukesmål (antall økter)</Text>
        <View style={styles.presetRow}>
          {WEEKLY_SESSION_GOAL_PRESETS.map((goal) => {
            const active = state.weeklySessionGoal === goal;
            return (
              <Pressable
                key={`sessions-${goal}`}
                onPress={() => updatePreferences({ weeklySessionGoal: goal })}
                style={[styles.presetChip, active && styles.presetChipActive]}
              >
                <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                  {goal} økter
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {Platform.OS === 'ios' ? (
        <>
          <Text style={styles.sectionLabel}>Integrasjoner</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Apple Helse</Text>
                <Text style={styles.rowSub}>
                  Loggfør fullførte økter som mindful minutes (krever bygget app, ikke Expo Go)
                </Text>
              </View>
              <Switch
                value={state.healthSyncEnabled}
                onValueChange={onHealthSyncToggle}
                trackColor={{ false: '#333', true: `${Colors.greenAccent}88` }}
                thumbColor={state.healthSyncEnabled ? Colors.greenAccent : '#888'}
              />
            </View>
          </View>
        </>
      ) : null}

      <Text style={styles.sectionLabel}>Data</Text>
      <View style={styles.card}>
        <Pressable onPress={confirmReset} style={styles.dangerRow}>
          <Text style={styles.dangerText}>Nullstill alle data</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Om</Text>
      <View style={styles.card}>
        <Pressable
          onPress={() => Linking.openURL('mailto:admin@biohead.no?subject=Biohead%20app')}
          style={styles.linkRow}
        >
          <Text style={styles.linkText}>Kontakt support</Text>
          <Text style={styles.linkArrow}>›</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable onPress={() => Linking.openURL('https://biohead.no')} style={styles.linkRow}>
          <Text style={styles.linkText}>Besøk oss på biohead.no</Text>
          <Text style={styles.linkArrow}>›</Text>
        </Pressable>
        <View style={styles.divider} />
        <Text style={styles.legal}>
          Biohead lagrer streak og økter kun lokalt på enheten (AsyncStorage). Ingen konto kreves.
          {'\n\n'}
          Appen er et verktøy for egenomsorg og velvære, ikke medisinsk behandling eller diagnose.
          Kontakt helsepersonell ved helseplager du er bekymret for.
        </Text>
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
    marginBottom: 28,
    letterSpacing: -0.5,
  },
  sectionLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'rgba(14,32,37,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.06)',
    paddingVertical: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  rowSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(14,32,37,0.08)',
    marginLeft: 16,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  previewBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.16)',
    backgroundColor: 'rgba(14,32,37,0.06)',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  previewBtnActive: {
    borderColor: `${Colors.greenAccent}88`,
    backgroundColor: `${Colors.greenAccent}22`,
  },
  previewBtnPressed: {
    opacity: 0.85,
  },
  previewBtnDisabled: {
    opacity: 0.6,
  },
  previewBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  previewBtnTextActive: {
    color: Colors.greenAccent,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(14,32,37,0.2)',
  },
  radioOn: {
    borderColor: Colors.greenAccent,
    backgroundColor: Colors.greenAccent,
  },
  presetLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(14,32,37,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
  },
  presetChipActive: {
    borderColor: Colors.greenAccent,
    backgroundColor: `${Colors.greenAccent}22`,
  },
  presetChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  presetChipTextActive: {
    color: Colors.greenAccent,
  },
  soundscapeList: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  soundscapeChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(14,32,37,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    gap: 4,
  },
  soundscapeChipActive: {
    borderColor: Colors.greenAccent,
    backgroundColor: `${Colors.greenAccent}18`,
  },
  soundscapeTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
  },
  soundscapeTitleActive: {
    color: Colors.greenAccent,
  },
  soundscapeSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  mixList: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  mixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    backgroundColor: 'rgba(14,32,37,0.04)',
  },
  mixInfo: {
    flex: 1,
  },
  mixTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
  },
  mixSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  mixControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mixBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.12)',
    backgroundColor: 'rgba(14,32,37,0.08)',
  },
  mixBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.textPrimary,
    marginTop: -1,
  },
  saveMixBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.greenAccent}55`,
    backgroundColor: `${Colors.greenAccent}18`,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  saveMixBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.greenAccent,
  },
  mixEmpty: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    paddingHorizontal: 4,
  },
  presetMixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetMixApply: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    backgroundColor: 'rgba(14,32,37,0.04)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  presetMixName: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
  },
  presetMixUse: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.greenAccent}66`,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: `${Colors.greenAccent}1A`,
  },
  presetMixUseText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.greenAccent,
  },
  presetMixDelete: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(14,32,37,0.06)',
  },
  presetMixDeleteText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  dangerRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dangerText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.error,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  linkText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.base,
    color: Colors.greenAccent,
  },
  linkArrow: {
    fontSize: 22,
    color: Colors.textMuted,
  },
  legal: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
