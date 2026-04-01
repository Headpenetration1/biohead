import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Audio } from 'expo-av';
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

export default function SoundMixerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, updatePreferences, saveAmbientPreset, applyAmbientPreset, deleteAmbientPreset } =
    useAppContext();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [mixNameDraft, setMixNameDraft] = useState('');
  const previewRefs = useRef<Partial<Record<AmbientSoundscape, Audio.Sound>>>({});

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

      <Text style={styles.title}>Lydmikser</Text>
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
              disabled={previewBusy}
              style={({ pressed }) => [
                styles.previewBtn,
                isPreviewing && styles.previewBtnActive,
                pressed && styles.previewBtnPressed,
                previewBusy && styles.previewBtnDisabled,
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
});
