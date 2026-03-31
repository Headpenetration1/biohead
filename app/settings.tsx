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
import type { SoundMode } from '@/utils/storage';
import { requestNotificationPermission } from '@/utils/reminders';
import { requestHealthKitMindfulAccess } from '@/utils/appleHealthMindful';

const REMINDER_PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: '08:00', hour: 8, minute: 0 },
  { label: '09:00', hour: 9, minute: 0 },
  { label: '12:00', hour: 12, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '21:00', hour: 21, minute: 0 },
];

const SOUND_OPTIONS: { mode: SoundMode; label: string; sub: string }[] = [
  { mode: 'off', label: 'Av', sub: 'Kun stille og haptikk' },
  { mode: 'cues', label: 'Signaler', sub: 'Korte toner ved fasebytte' },
  { mode: 'ambient', label: 'Ambient', sub: 'Myk bakgrunnslyd under økt' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, updatePreferences, resetData } = useAppContext();

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
        {SOUND_OPTIONS.map((opt, i) => (
          <View key={opt.mode}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={() => updatePreferences({ soundMode: opt.mode })}
              style={styles.soundRow}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{opt.label}</Text>
                <Text style={styles.rowSub}>{opt.sub}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  state.soundMode === opt.mode && styles.radioOn,
                ]}
              />
            </Pressable>
          </View>
        ))}
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
            <Text style={styles.presetLabel}>Tidspunkt</Text>
            <View style={styles.presetRow}>
              {REMINDER_PRESETS.map((p) => {
                const active =
                  state.reminderHour === p.hour && state.reminderMinute === p.minute;
                return (
                  <Pressable
                    key={p.label}
                    onPress={() =>
                      updatePreferences({ reminderHour: p.hour, reminderMinute: p.minute })
                    }
                    style={[styles.presetChip, active && styles.presetChipActive]}
                  >
                    <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
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
        <Text style={styles.legal}>
          Biohead lagrer streak og økter kun lokalt på enheten (AsyncStorage). Ingen konto kreves.
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 16,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
