import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, useWindowDimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { Bell, Leaf, Music, Volume2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useAppContext } from '@/context/AppContext';
import { ensureToneFile, TONE_PRESETS } from '@/utils/toneGenerator';
import { ensureAudioMode } from '@/utils/audioMode';
import {
  type AmbientSoundscape,
  AMBIENT_SOUNDSCAPE_IDS,
  AMBIENT_SOUNDSCAPE_OPTIONS,
} from '@/constants/ambientSounds';
import {
  applyAmbientMix,
  ensureAmbientSounds,
  playAmbientSounds,
  unloadAmbientSounds,
} from '@/utils/ambientAudio';
import { activeAmbientTracks } from '@/utils/audioPolicy';

export default function SoundMixerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactToneLayout = width <= 390;
  const { state, updatePreferences, saveAmbientPreset, applyAmbientPreset, deleteAmbientPreset } =
    useAppContext();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [mixNameDraft, setMixNameDraft] = useState('');
  const toneFrequency = state.toneFrequency;
  const toneVolume = state.toneVolume;
  const [isTonePreviewing, setIsTonePreviewing] = useState(false);
  const [toneBusy, setToneBusy] = useState(false);
  const previewRefs = useRef<Partial<Record<AmbientSoundscape, Audio.Sound>>>({});
  const toneRef = useRef<Audio.Sound | null>(null);
  const toneRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewGenerationRef = useRef(0);

  const isSoloMix = useCallback((mix: Record<AmbientSoundscape, number>, target: AmbientSoundscape): boolean => {
    return AMBIENT_SOUNDSCAPE_IDS.every((id) =>
      id === target ? (mix[id] ?? 0) > 0.99 : (mix[id] ?? 0) <= 0.01
    );
  }, []);

  const stopPreview = useCallback(async () => {
    await unloadAmbientSounds(previewRefs.current);
  }, []);

  const stopTonePreview = useCallback(async () => {
    if (toneRestartTimerRef.current) {
      clearTimeout(toneRestartTimerRef.current);
      toneRestartTimerRef.current = null;
    }
    if (!toneRef.current) return;
    const sound = toneRef.current;
    toneRef.current = null;
    try {
      await sound.stopAsync();
    } catch (e) {
      if (__DEV__) console.warn('[lydmikser] stopAsync tone failed', e);
    }
    try {
      await sound.unloadAsync();
    } catch (e) {
      if (__DEV__) console.warn('[lydmikser] unloadAsync tone failed', e);
    }
    setIsTonePreviewing(false);
  }, []);

  const startTonePreview = useCallback(async () => {
    setToneBusy(true);
    try {
      await ensureAudioMode();
      await stopPreview();
      setIsPreviewing(false);
      await stopTonePreview();
      const fileUri = await ensureToneFile(toneFrequency);
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { isLooping: true, volume: toneVolume }
      );
      toneRef.current = sound;
      await sound.playAsync();
      setIsTonePreviewing(true);
    } catch (error) {
      if (__DEV__) {
        console.warn('Tone preview failed', error);
      }
    } finally {
      setToneBusy(false);
    }
  }, [stopPreview, stopTonePreview, toneFrequency, toneVolume]);

  const setToneFrequencyAndRefresh = useCallback(
    (next: number) => {
      const normalized = Math.max(40, Math.min(1000, Math.round(next)));
      updatePreferences({ toneFrequency: normalized });
      if (!isTonePreviewing) return;
      if (toneRestartTimerRef.current) {
        clearTimeout(toneRestartTimerRef.current);
      }
      toneRestartTimerRef.current = setTimeout(() => {
        void startTonePreview();
      }, 180);
    },
    [isTonePreviewing, startTonePreview, updatePreferences]
  );

  const previewActiveKey = activeAmbientTracks(state.ambientMix).join(',');

  // Structural: load the tracks that are audible / unload the silent ones, then
  // play. Only re-runs when the *set* of audible tracks changes — not on every
  // volume nudge (those are handled by the live-volume effect below).
  useEffect(() => {
    let cancelled = false;
    const generation = ++previewGenerationRef.current;
    const runPreview = async () => {
      if (!isPreviewing) {
        await stopPreview();
        return;
      }
      setPreviewBusy(true);
      try {
        await ensureAudioMode();
        if (cancelled) return;
        await ensureAmbientSounds(previewRefs.current, activeAmbientTracks(state.ambientMix));
        if (cancelled || generation !== previewGenerationRef.current) return;
        await applyAmbientMix(previewRefs.current, state.ambientMix);
        if (cancelled || generation !== previewGenerationRef.current) return;
        await playAmbientSounds(previewRefs.current);
      } catch (error) {
        if (__DEV__) {
          console.warn('Ambient preview failed', error);
        }
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    };
    void runPreview();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewing, previewActiveKey, stopPreview]);

  // Live volume: while previewing, reflect slider changes instantly without
  // rebuilding the sound graph.
  useEffect(() => {
    if (!isPreviewing) return;
    void applyAmbientMix(previewRefs.current, state.ambientMix, false).catch(() => {});
  }, [isPreviewing, state.ambientMix]);

  useEffect(() => {
    return () => {
      if (toneRestartTimerRef.current) {
        clearTimeout(toneRestartTimerRef.current);
      }
      void stopPreview();
      void stopTonePreview();
    };
  }, [stopPreview, stopTonePreview]);

  useEffect(() => {
    if (!isTonePreviewing || !toneRef.current) return;
    void toneRef.current.setVolumeAsync(toneVolume).catch(() => {});
  }, [isTonePreviewing, toneVolume]);

  const setAmbientLevel = useCallback(
    (id: AmbientSoundscape, nextLevel: number) => {
      const clamped = Math.max(0, Math.min(1, nextLevel));
      const mix = { ...state.ambientMix, [id]: clamped };
      updatePreferences({ ambientMix: mix, ambientSoundscape: id });
    },
    [state.ambientMix, updatePreferences]
  );

  const setAmbientSolo = useCallback(
    (id: AmbientSoundscape) => {
      if (isSoloMix(state.ambientMix, id)) {
        const cleared = AMBIENT_SOUNDSCAPE_IDS.reduce<Record<AmbientSoundscape, number>>(
          (acc, soundId) => ({ ...acc, [soundId]: 0 }),
          {} as Record<AmbientSoundscape, number>
        );
        updatePreferences({ ambientMix: cleared, ambientSoundscape: 'neutral' });
        return;
      }
      const solo = AMBIENT_SOUNDSCAPE_IDS.reduce<Record<AmbientSoundscape, number>>(
        (acc, soundId) => ({ ...acc, [soundId]: soundId === id ? 1 : 0 }),
        {} as Record<AmbientSoundscape, number>
      );
      updatePreferences({ ambientMix: solo, ambientSoundscape: id });
    },
    [isSoloMix, state.ambientMix, updatePreferences]
  );

  const disableAmbientPreviewToggle = previewBusy || (!isPreviewing && (isTonePreviewing || toneBusy));
  const disableTonePreviewToggle = toneBusy || (!isTonePreviewing && (isPreviewing || previewBusy));
  const toneGeneratorSection = (
    <View style={styles.toneSection}>
      <View style={styles.toneHeaderRow}>
        <Text style={styles.toneValue}>{Math.round(toneFrequency)} Hz</Text>
        <Pressable
          onPress={() => {
            if (isTonePreviewing) {
              void stopTonePreview();
            } else {
              void startTonePreview();
            }
          }}
          disabled={disableTonePreviewToggle}
          accessibilityRole="button"
          accessibilityLabel={isTonePreviewing ? 'Stopp forh\u00e5ndsvisning av tone' : 'Spill av forh\u00e5ndsvisning av tone'}
          accessibilityState={{ busy: toneBusy, disabled: disableTonePreviewToggle }}
          style={({ pressed }) => [
            styles.previewBtn,
            isTonePreviewing && styles.previewBtnActive,
            pressed && styles.previewBtnPressed,
            disableTonePreviewToggle && styles.previewBtnDisabled,
          ]}
        >
          <Text style={[styles.previewBtnText, isTonePreviewing && styles.previewBtnTextActive]}>
            {toneBusy ? 'Laster…' : isTonePreviewing ? 'Stopp' : 'Spill av'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.toneLabel}>Frekvens</Text>
      <Slider
        value={toneFrequency}
        minimumValue={40}
        maximumValue={1000}
        step={1}
        minimumTrackTintColor={Colors.greenAccent}
        maximumTrackTintColor="rgba(14,32,37,0.12)"
        thumbTintColor={Colors.greenAccent}
        onValueChange={(value) => setToneFrequencyAndRefresh(value)}
      />
      <View style={[styles.toneNudgeRow, isCompactToneLayout && styles.toneNudgeRowCompact]}>
        <Pressable
          onPress={() => setToneFrequencyAndRefresh(toneFrequency - 10)}
          style={styles.mixBtn}
          accessibilityRole="button"
          accessibilityLabel="Reduser frekvens 10 hertz"
          hitSlop={6}
        >
          <Text style={styles.mixBtnText}>−10</Text>
        </Pressable>
        <Pressable
          onPress={() => setToneFrequencyAndRefresh(toneFrequency + 10)}
          style={styles.mixBtn}
          accessibilityRole="button"
          accessibilityLabel="\u00d8k frekvens 10 hertz"
          hitSlop={6}
        >
          <Text style={styles.mixBtnText}>+10</Text>
        </Pressable>
      </View>

      <Text style={styles.toneLabel}>Volum ({Math.round(toneVolume * 100)}%)</Text>
      <Slider
        value={toneVolume}
        minimumValue={0}
        maximumValue={1}
        step={0.01}
        minimumTrackTintColor={Colors.greenAccent}
        maximumTrackTintColor="rgba(14,32,37,0.12)"
        thumbTintColor={Colors.greenAccent}
        onValueChange={(value) => updatePreferences({ toneVolume: value })}
      />

      <Text style={styles.toneLabel}>Presets</Text>
      <View style={[styles.tonePresetRow, isCompactToneLayout && styles.tonePresetRowCompact]}>
        {TONE_PRESETS.map((preset) => {
          const active = Math.round(toneFrequency) === preset;
          return (
            <Pressable
              key={`preset-${preset}`}
              onPress={() => setToneFrequencyAndRefresh(preset)}
              accessibilityRole="radio"
              accessibilityLabel={`${preset} hertz forh\u00e5ndsvalg`}
              accessibilityState={{ selected: active }}
              hitSlop={4}
              style={[
                styles.tonePresetChip,
                isCompactToneLayout && styles.tonePresetChipCompact,
                active && styles.tonePresetChipActive,
              ]}
            >
              <Text
                style={[
                  styles.tonePresetText,
                  isCompactToneLayout && styles.tonePresetTextCompact,
                  active && styles.tonePresetTextActive,
                ]}
              >
                {preset} Hz
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.toneSessionRow}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Bruk under økt</Text>
          <Text style={styles.rowSub}>Spill tone under pusteøvelser</Text>
        </View>
        <Pressable
          onPress={() => updatePreferences({ toneEnabled: !state.toneEnabled })}
          style={[styles.radio, state.toneEnabled && styles.radioOn]}
          accessibilityRole="switch"
          accessibilityLabel="Bruk tone under økt"
          accessibilityState={{ checked: state.toneEnabled }}
        />
      </View>
      <Text style={styles.toneHint}>
        Start med lavt volum. Tonegenerator er for egen utforsking og ikke medisinsk behandling.
      </Text>
    </View>
  );

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

      <View style={styles.titleRow}>
        <Volume2 size={28} color={Colors.textPrimary} strokeWidth={1.8} />
        <Text style={styles.title}>Lydmikser</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.sessionToggleRow}>
          <View style={styles.rowText}>
            <View style={styles.rowTitleWithIcon}>
              <Bell size={16} color={Colors.textPrimary} strokeWidth={1.8} />
              <Text style={styles.rowTitle}>Signaler</Text>
            </View>
            <Text style={styles.rowSub}>Korte toner ved fasebytte</Text>
          </View>
          <Pressable
            onPress={() => {
              const cuesOn = state.soundMode === 'cues' || state.soundMode === 'mix';
              const ambientOn = state.soundMode === 'ambient' || state.soundMode === 'mix';
              if (cuesOn) {
                updatePreferences({ soundMode: ambientOn ? 'ambient' : 'off' });
              } else {
                updatePreferences({ soundMode: ambientOn ? 'mix' : 'cues' });
              }
            }}
            style={[styles.radio, (state.soundMode === 'cues' || state.soundMode === 'mix') && styles.radioOn]}
            accessibilityRole="switch"
            accessibilityLabel="Bruk signaler under økt"
            accessibilityState={{
              checked: state.soundMode === 'cues' || state.soundMode === 'mix',
            }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sessionToggleRow}>
          <View style={styles.rowText}>
            <View style={styles.rowTitleWithIcon}>
              <Leaf size={16} color={Colors.textPrimary} strokeWidth={1.8} />
              <Text style={styles.rowTitle}>Natur / ambient</Text>
            </View>
            <Text style={styles.rowSub}>Bakgrunnslyder under pusteøvelser</Text>
          </View>
          <Pressable
            onPress={() => {
              const ambientOn = state.soundMode === 'ambient' || state.soundMode === 'mix';
              const cuesOn = state.soundMode === 'cues' || state.soundMode === 'mix';
              if (ambientOn) {
                updatePreferences({ soundMode: cuesOn ? 'cues' : 'off' });
              } else {
                updatePreferences({ soundMode: cuesOn ? 'mix' : 'ambient' });
              }
            }}
            style={[styles.radio, (state.soundMode === 'ambient' || state.soundMode === 'mix') && styles.radioOn]}
            accessibilityRole="switch"
            accessibilityLabel="Bruk naturlyder under økt"
            accessibilityState={{
              checked: state.soundMode === 'ambient' || state.soundMode === 'mix',
            }}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.previewRow}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Forhåndslytt</Text>
            <Text style={styles.rowSub}>Hør lydene før du starter en økt</Text>
          </View>
          <Pressable
            onPress={() => setIsPreviewing((prev) => !prev)}
            disabled={disableAmbientPreviewToggle}
            accessibilityRole="button"
            accessibilityLabel={isPreviewing ? 'Stopp forh\u00e5ndslytting' : 'Spill av forh\u00e5ndslytting'}
            accessibilityState={{ busy: previewBusy, disabled: disableAmbientPreviewToggle }}
            style={({ pressed }) => [
              styles.previewBtn,
              isPreviewing && styles.previewBtnActive,
              pressed && styles.previewBtnPressed,
              disableAmbientPreviewToggle && styles.previewBtnDisabled,
            ]}
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
            const active = state.ambientSoundscape === opt.id && isSoloMix(state.ambientMix, opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => setAmbientSolo(opt.id)}
                accessibilityRole="radio"
                accessibilityLabel={`Bruk kun ${opt.label}`}
                accessibilityHint={opt.sub}
                accessibilityState={{ selected: active }}
                style={[styles.soundscapeChip, active && styles.soundscapeChipActive]}
              >
                <Text style={[styles.soundscapeTitle, active && styles.soundscapeTitleActive]}>
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
                <View style={styles.mixInfoRow}>
                  <Text style={styles.mixTitle}>{opt.label}</Text>
                  <Text style={styles.mixSub}>{pct}%</Text>
                </View>
                <Slider
                  value={level}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  minimumTrackTintColor={Colors.greenAccent}
                  maximumTrackTintColor="rgba(14,32,37,0.12)"
                  thumbTintColor={Colors.greenAccent}
                  onValueChange={(value) => setAmbientLevel(opt.id, value)}
                  accessibilityLabel={`${opt.label} volum`}
                />
              </View>
            );
          })}
        </View>
        <View style={styles.divider} />
        <Text style={styles.presetLabel}>Lagrede mikser</Text>
        <View style={styles.mixList}>
          <TextInput
            value={mixNameDraft}
            onChangeText={setMixNameDraft}
            placeholder="Navn på miks (f.eks. Kveld ro)"
            placeholderTextColor={Colors.textMuted}
            style={styles.mixNameInput}
            maxLength={40}
          />
          <Pressable
            onPress={() => {
              saveAmbientPreset(mixNameDraft.trim() || undefined);
              setMixNameDraft('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Lagre n\u00e5v\u00e6rende miks"
            style={styles.saveMixBtn}
          >
            <Text style={styles.saveMixBtnText}>Lagre nåværende miks</Text>
          </Pressable>
          {state.ambientMixPresets.length === 0 ? (
            <Text style={styles.mixEmpty}>
              Ingen lagrede mikser ennå. Juster volumene over og trykk «Lagre nåværende miks» for å ta vare på den.
            </Text>
          ) : (
            state.ambientMixPresets.map((preset) => (
              <View key={preset.id} style={styles.presetMixRow}>
                <View style={styles.presetMixApply}>
                  <Text style={styles.presetMixName}>{preset.name}</Text>
                </View>
                <Pressable
                  onPress={() => applyAmbientPreset(preset.id)}
                  style={styles.presetMixUse}
                  accessibilityRole="button"
                  accessibilityLabel={`Bruk miks ${preset.name}`}
                  hitSlop={6}
                >
                  <Text style={styles.presetMixUseText}>Bruk</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      'Slette miks?',
                      `${preset.name} blir fjernet permanent.`,
                      [
                        { text: 'Avbryt', style: 'cancel' },
                        {
                          text: 'Slett',
                          style: 'destructive',
                          onPress: () => deleteAmbientPreset(preset.id),
                        },
                      ]
                    )
                  }
                  style={styles.presetMixDelete}
                  accessibilityRole="button"
                  accessibilityLabel={`Slett miks ${preset.name}`}
                  hitSlop={6}
                >
                  <Text style={styles.presetMixDeleteText}>Slett</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.presetLabelRow}>
          <Music size={15} color={Colors.textMuted} strokeWidth={1.8} />
          <Text style={styles.presetLabelText}>Tonegenerator (beta)</Text>
        </View>
        {toneGeneratorSection}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24 },
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
  backArrow: { fontSize: 22, color: Colors.textSecondary, marginTop: -2 },
  backText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(14,32,37,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.06)',
    paddingVertical: 8,
    marginBottom: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(14,32,37,0.08)',
    marginLeft: 16,
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  rowTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(14,32,37,0.2)',
  },
  radioOn: { borderColor: Colors.greenAccent, backgroundColor: Colors.greenAccent },
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
  previewBtnPressed: { opacity: 0.85 },
  previewBtnDisabled: { opacity: 0.6 },
  previewBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  previewBtnTextActive: { color: Colors.greenAccent },
  presetLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  presetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  presetLabelText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
  soundscapeList: { gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
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
  soundscapeTitleActive: { color: Colors.greenAccent },
  soundscapeSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  mixList: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  mixRow: {
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    backgroundColor: 'rgba(14,32,37,0.04)',
  },
  mixInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  mixNameInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.12)',
    backgroundColor: 'rgba(14,32,37,0.06)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
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
  presetMixRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  toneSection: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  toneHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toneValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.sizes.lg,
    color: Colors.textPrimary,
  },
  toneLabel: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  toneNudgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -4,
  },
  toneNudgeRowCompact: {
    gap: 6,
  },
  tonePresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tonePresetRowCompact: {
    gap: 6,
  },
  tonePresetChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.12)',
    backgroundColor: 'rgba(14,32,37,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tonePresetChipCompact: {
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  tonePresetChipActive: {
    borderColor: `${Colors.greenAccent}88`,
    backgroundColor: `${Colors.greenAccent}22`,
  },
  tonePresetText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  tonePresetTextCompact: {
    fontSize: Typography.sizes.xs,
  },
  tonePresetTextActive: {
    color: Colors.greenAccent,
  },
  sessionToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  toneSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  toneHint: {
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
