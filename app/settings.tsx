import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Audio } from 'expo-av';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useAppContext } from '@/context/AppContext';
import type { ReminderTime, SoundMode } from '@/utils/storage';
import {
  type AmbientSoundscape,
  AMBIENT_SOUND_MODULES,
  AMBIENT_SOUND_VOLUMES,
  AMBIENT_SOUNDSCAPE_IDS,
  AMBIENT_SOUNDSCAPE_OPTIONS,
} from '@/constants/ambientSounds';
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

const SOUND_OPTIONS: { mode: SoundMode; label: string; sub: string }[] = [
  { mode: 'off', label: 'Av', sub: 'Kun stille og haptikk' },
  { mode: 'cues', label: 'Signaler', sub: 'Korte toner ved fasebytte' },
  {
    mode: 'ambient',
    label: 'Natur / ambient',
    sub: 'Vind, fugler, regn m.m. under økt (velg nedenfor)',
  },
];

let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  // Keep audio mode setup idempotent to avoid repeated native calls.
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    state,
    updatePreferences,
    resetData,
    saveAmbientPreset,
    applyAmbientPreset,
    deleteAmbientPreset,
  } = useAppContext();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewRefs = useRef<Partial<Record<AmbientSoundscape, Audio.Sound>>>({});

  const stopPreview = useCallback(async () => {
    // Always stop+unload previously created sounds to prevent leaks/overlap.
    const sounds = Object.values(previewRefs.current).filter(
      (sound): sound is Audio.Sound => sound != null
    );
    previewRefs.current = {};
    for (const sound of sounds) {
      try {
        await sound.stopAsync();
      } catch {
        /* ignore */
      }
      try {
        await sound.unloadAsync();
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runPreview = async () => {
      if (!isPreviewing || state.soundMode !== 'ambient') {
        await stopPreview();
        return;
      }
      setPreviewBusy(true);
      try {
        await ensureAudioMode();
        if (cancelled) return;
        await stopPreview();
        if (cancelled) return;

        // Play every active track in the mix, otherwise fall back to selected solo soundscape.
        const activeMix = AMBIENT_SOUNDSCAPE_IDS.filter((id) => (state.ambientMix[id] ?? 0) > 0.01);
        const targets = activeMix.length > 0 ? activeMix : [state.ambientSoundscape];

        for (const id of targets) {
          const { sound } = await Audio.Sound.createAsync(AMBIENT_SOUND_MODULES[id], {
            isLooping: true,
            volume: AMBIENT_SOUND_VOLUMES[id] * (state.ambientMix[id] ?? 1),
          });
          if (cancelled) {
            // Cleanup immediately if UI state changed while loading.
            await sound.unloadAsync();
            return;
          }
          previewRefs.current[id] = sound;
          await sound.playAsync();
        }
      } catch (error) {
        console.warn('Ambient preview failed', error);
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    };

    void runPreview();
    return () => {
      cancelled = true;
    };
  }, [isPreviewing, state.soundMode, state.ambientMix, state.ambientSoundscape, stopPreview]);

  useEffect(() => {
    return () => {
      void stopPreview();
    };
  }, [stopPreview]);

  const setAmbientLevel = useCallback(
    (id: AmbientSoundscape, nextLevel: number) => {
      const clamped = Math.max(0, Math.min(1, nextLevel));
      const mix = { ...state.ambientMix, [id]: clamped };
      const activeCount = AMBIENT_SOUNDSCAPE_IDS.filter((soundId) => (mix[soundId] ?? 0) > 0.01).length;
      if (activeCount === 0) {
        mix.wind = 1;
      }
      updatePreferences({ ambientMix: mix, ambientSoundscape: id });
    },
    [state.ambientMix, updatePreferences]
  );

  const setAmbientSolo = useCallback(
    (id: AmbientSoundscape) => {
      const solo = AMBIENT_SOUNDSCAPE_IDS.reduce<Record<AmbientSoundscape, number>>(
        (acc, soundId) => ({
          ...acc,
          [soundId]: soundId === id ? 1 : 0,
        }),
        {} as Record<AmbientSoundscape, number>
      );
      updatePreferences({ ambientMix: solo, ambientSoundscape: id });
    },
    [updatePreferences]
  );

  const saveCurrentMix = useCallback(() => {
    saveAmbientPreset();
  }, [saveAmbientPreset]);

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
        {state.soundMode === 'ambient' ? (
          <>
            <View style={styles.divider} />
            <View style={styles.previewRow}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Forhåndslytt miks</Text>
                <Text style={styles.rowSub}>Hør lydene før du starter en økt</Text>
              </View>
              <Pressable
                onPress={() => setIsPreviewing((prev) => !prev)}
                disabled={previewBusy}
                style={({ pressed }) => [
                  styles.previewBtn,
                  isPreviewing && styles.previewBtnActive,
                  pressed && styles.previewBtnPressed,
                  previewBusy && styles.previewBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isPreviewing ? 'Stopp forhåndslytting' : 'Start forhåndslytting'}
              >
                <Text style={[styles.previewBtnText, isPreviewing && styles.previewBtnTextActive]}>
                  {previewBusy ? 'Laster…' : isPreviewing ? 'Stopp' : 'Spill av'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.divider} />
            <Text style={styles.presetLabel}>Hurtigvalg (solo)</Text>
            <View style={styles.soundscapeList}>
              {AMBIENT_SOUNDSCAPE_OPTIONS.map((opt) => {
                const active = state.ambientSoundscape === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setAmbientSolo(opt.id)}
                    style={[styles.soundscapeChip, active && styles.soundscapeChipActive]}
                  >
                    <Text
                      style={[
                        styles.soundscapeTitle,
                        active && styles.soundscapeTitleActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.soundscapeSub} numberOfLines={2}>
                      {opt.sub}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.divider} />
            <Text style={styles.presetLabel}>Mikser (kombiner lyder)</Text>
            <View style={styles.mixList}>
              {AMBIENT_SOUNDSCAPE_OPTIONS.map((opt) => {
                const level = state.ambientMix[opt.id] ?? 0;
                const pct = Math.round(level * 100);
                return (
                  <View key={`mix-${opt.id}`} style={styles.mixRow}>
                    <View style={styles.mixInfo}>
                      <Text style={styles.mixTitle}>{opt.label}</Text>
                      <Text style={styles.mixSub}>{pct}%</Text>
                    </View>
                    <View style={styles.mixControls}>
                      <Pressable
                        onPress={() => setAmbientLevel(opt.id, level - 0.2)}
                        style={styles.mixBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Reduser ${opt.label}`}
                      >
                        <Text style={styles.mixBtnText}>−</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setAmbientLevel(opt.id, level + 0.2)}
                        style={styles.mixBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Øk ${opt.label}`}
                      >
                        <Text style={styles.mixBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.divider} />
            <Text style={styles.presetLabel}>Lagrede mikser</Text>
            <View style={styles.mixList}>
              <Pressable onPress={saveCurrentMix} style={styles.saveMixBtn}>
                <Text style={styles.saveMixBtnText}>Lagre nåværende miks</Text>
              </Pressable>
              {state.ambientMixPresets.length === 0 ? (
                <Text style={styles.mixEmpty}>Ingen lagrede mikser ennå.</Text>
              ) : (
                state.ambientMixPresets.map((preset) => (
                  <View key={preset.id} style={styles.presetMixRow}>
                    <Pressable
                      onPress={() => applyAmbientPreset(preset.id)}
                      style={styles.presetMixApply}
                      accessibilityRole="button"
                      accessibilityLabel={`Bruk miks ${preset.name}`}
                    >
                      <Text style={styles.presetMixName}>{preset.name}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => deleteAmbientPreset(preset.id)}
                      style={styles.presetMixDelete}
                      accessibilityRole="button"
                      accessibilityLabel={`Slett miks ${preset.name}`}
                    >
                      <Text style={styles.presetMixDeleteText}>Slett</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
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
