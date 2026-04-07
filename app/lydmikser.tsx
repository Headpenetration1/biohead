import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { File, Paths } from 'expo-file-system';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { useAppContext } from '@/context/AppContext';
import type { SoundMode } from '@/utils/storage';
import {
  type AmbientSoundscape,
  AMBIENT_SOUND_MODULES,
  AMBIENT_SOUND_VOLUMES,
  AMBIENT_SOUNDSCAPE_IDS,
  AMBIENT_SOUNDSCAPE_OPTIONS,
} from '@/constants/ambientSounds';

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
const TONE_SAMPLE_RATE = 44100;
const TONE_DURATION_TARGET_SECONDS = 30;
const TONE_PRESETS = [100, 157, 432, 528, 741];

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function buildSineWavBytes(frequencyHz: number): Uint8Array {
  const freq = Math.max(40, Math.min(1000, Math.round(frequencyHz)));
  const cycles = Math.max(1, Math.round(freq * TONE_DURATION_TARGET_SECONDS));
  const sampleCount = Math.max(2, Math.round((TONE_SAMPLE_RATE * cycles) / freq));
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, TONE_SAMPLE_RATE, true);
  view.setUint32(28, TONE_SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const phaseCycles = 2 * Math.PI * cycles;
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / (sampleCount - 1);
    const sample = Math.sin(phaseCycles * t);
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, Math.round(clamped * 32767), true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

async function ensureToneFile(frequencyHz: number): Promise<string> {
  const normalized = Math.max(40, Math.min(1000, Math.round(frequencyHz)));
  const file = new File(Paths.cache, `tone-${normalized}.wav`);
  const bytes = buildSineWavBytes(normalized);
  file.create({ overwrite: true });
  file.write(bytes);
  return file.uri;
}

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
  const [toneFrequency, setToneFrequency] = useState(157);
  const [toneVolume, setToneVolume] = useState(0.5);
  const [isTonePreviewing, setIsTonePreviewing] = useState(false);
  const [toneBusy, setToneBusy] = useState(false);
  const previewRefs = useRef<Partial<Record<AmbientSoundscape, Audio.Sound>>>({});
  const toneRef = useRef<Audio.Sound | null>(null);
  const toneRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSoloMix = useCallback((mix: Record<AmbientSoundscape, number>, target: AmbientSoundscape): boolean => {
    return AMBIENT_SOUNDSCAPE_IDS.every((id) =>
      id === target ? (mix[id] ?? 0) > 0.99 : (mix[id] ?? 0) <= 0.01
    );
  }, []);

  const stopPreview = useCallback(async () => {
    const sounds = Object.values(previewRefs.current).filter(
      (sound): sound is Audio.Sound => sound != null
    );
    previewRefs.current = {};
    for (const sound of sounds) {
      try {
        await sound.stopAsync();
      } catch {}
      try {
        await sound.unloadAsync();
      } catch {}
    }
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
    } catch {}
    try {
      await sound.unloadAsync();
    } catch {}
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
      console.warn('Tone preview failed', error);
    } finally {
      setToneBusy(false);
    }
  }, [stopPreview, stopTonePreview, toneFrequency, toneVolume]);

  const setToneFrequencyAndRefresh = useCallback(
    (next: number) => {
      const normalized = Math.max(40, Math.min(1000, Math.round(next)));
      setToneFrequency(normalized);
      if (!isTonePreviewing) return;
      if (toneRestartTimerRef.current) {
        clearTimeout(toneRestartTimerRef.current);
      }
      toneRestartTimerRef.current = setTimeout(() => {
        void startTonePreview();
      }, 180);
    },
    [isTonePreviewing, startTonePreview]
  );

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
        const activeMix = AMBIENT_SOUNDSCAPE_IDS.filter((id) => (state.ambientMix[id] ?? 0) > 0.01);
        for (const id of activeMix) {
          const { sound } = await Audio.Sound.createAsync(AMBIENT_SOUND_MODULES[id], {
            isLooping: true,
            volume: AMBIENT_SOUND_VOLUMES[id] * (state.ambientMix[id] ?? 1),
          });
          if (cancelled) {
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
  }, [isPreviewing, state.soundMode, state.ambientMix, stopPreview]);

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

      <View style={styles.titleRow}>
        <Text style={styles.titleIcon}>🔊</Text>
        <Text style={styles.title}>Lydmikser</Text>
      </View>
      <View style={styles.card}>
        {SOUND_OPTIONS.map((opt, i) => (
          <View key={opt.mode}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <Pressable onPress={() => updatePreferences({ soundMode: opt.mode })} style={styles.soundRow}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{opt.label}</Text>
                <Text style={styles.rowSub}>{opt.sub}</Text>
              </View>
              <View style={[styles.radio, state.soundMode === opt.mode && styles.radioOn]} />
            </Pressable>
          </View>
        ))}
      </View>

      {state.soundMode === 'ambient' ? (
        <View style={styles.card}>
          <View style={styles.previewRow}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Forhåndslytt miks</Text>
              <Text style={styles.rowSub}>Hør lydene før du starter en økt</Text>
            </View>
            <Pressable
              onPress={() => setIsPreviewing((prev) => !prev)}
              disabled={disableAmbientPreviewToggle}
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
                  <View style={styles.mixInfo}>
                    <Text style={styles.mixTitle}>{opt.label}</Text>
                    <Text style={styles.mixSub}>{pct}%</Text>
                  </View>
                  <View style={styles.mixControls}>
                    <Pressable onPress={() => setAmbientLevel(opt.id, level - 0.2)} style={styles.mixBtn}>
                      <Text style={styles.mixBtnText}>−</Text>
                    </Pressable>
                    <Pressable onPress={() => setAmbientLevel(opt.id, level + 0.2)} style={styles.mixBtn}>
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
              style={styles.saveMixBtn}
            >
              <Text style={styles.saveMixBtnText}>Lagre nåværende miks</Text>
            </Pressable>
            {state.ambientMixPresets.length === 0 ? (
              <Text style={styles.mixEmpty}>Ingen lagrede mikser ennå.</Text>
            ) : (
              state.ambientMixPresets.map((preset) => (
                <View key={preset.id} style={styles.presetMixRow}>
                  <View style={styles.presetMixApply}>
                    <Text style={styles.presetMixName}>{preset.name}</Text>
                  </View>
                  <Pressable onPress={() => applyAmbientPreset(preset.id)} style={styles.presetMixUse}>
                    <Text style={styles.presetMixUseText}>Bruk</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteAmbientPreset(preset.id)} style={styles.presetMixDelete}>
                    <Text style={styles.presetMixDeleteText}>Slett</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>
      ) : null}

      {state.soundMode === 'cues' ? (
        <View style={styles.card}>
          <Text style={styles.presetLabel}>Tone generator (beta)</Text>
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
              >
                <Text style={styles.mixBtnText}>−10</Text>
              </Pressable>
              <Pressable
                onPress={() => setToneFrequencyAndRefresh(toneFrequency + 10)}
                style={styles.mixBtn}
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
              onValueChange={(value) => setToneVolume(value)}
            />

            <Text style={styles.toneLabel}>Presets</Text>
            <View style={[styles.tonePresetRow, isCompactToneLayout && styles.tonePresetRowCompact]}>
              {TONE_PRESETS.map((preset) => {
                const active = Math.round(toneFrequency) === preset;
                return (
                  <Pressable
                    key={`preset-${preset}`}
                    onPress={() => setToneFrequencyAndRefresh(preset)}
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
            <Text style={styles.toneHint}>
              Start med lavt volum. Tonegenerator er for egen utforsking og ikke medisinsk behandling.
            </Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBase },
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
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    fontSize: 28,
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
  rowSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
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
  mixInfo: { flex: 1 },
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
  mixControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  toneHint: {
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
