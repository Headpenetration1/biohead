import { useEffect, useRef, useCallback } from 'react';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import type { SoundMode } from '@/utils/storage';
import type { BreathingPhase } from '@/constants/exercises';
import { ensureToneFile } from '@/utils/toneGenerator';
import { ensureAudioMode } from '@/utils/audioMode';
import {
  type AmbientMix,
  type AmbientSoundscape,
  AMBIENT_SOUND_MODULES,
  AMBIENT_SOUND_VOLUMES,
} from '@/constants/ambientSounds';
import {
  activeAmbientTracks,
  areCuesEnabled,
  effectiveCueVolume,
  isAmbientEnabled,
} from '@/utils/audioPolicy';

const inhaleCue = require('@/assets/sounds/cue_inhale.wav');
const exhaleCue = require('@/assets/sounds/cue_exhale.wav');
const holdCue = require('@/assets/sounds/cue_hold.wav');

export function useBreathAudio(
  soundMode: SoundMode,
  cueVolume: number,
  ambientSoundscape: AmbientSoundscape,
  ambientMix: AmbientMix,
  isSessionActive: boolean,
  isPaused: boolean,
  currentPhase: BreathingPhase,
  toneEnabled = false,
  toneFrequency = 157,
  toneVolume = 0.5
) {
  const ambientEnabled = isAmbientEnabled(soundMode);
  const cuesEnabled = areCuesEnabled(soundMode, cueVolume);
  const ambientRefs = useRef<Partial<Record<AmbientSoundscape, Audio.Sound>>>({});
  const toneRef = useRef<Audio.Sound | null>(null);
  const cueRef = useRef<Audio.Sound | null>(null);
  const lastPhaseRef = useRef<BreathingPhase | null>(null);

  useEffect(() => {
    if (!isSessionActive) {
      lastPhaseRef.current = null;
    }
  }, [isSessionActive]);

  const unloadAmbient = useCallback(async () => {
    const sounds = Object.values(ambientRefs.current).filter(
      (sound): sound is Audio.Sound => sound != null
    );
    ambientRefs.current = {};
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

  const unloadTone = useCallback(async () => {
    if (toneRef.current) {
      try { await toneRef.current.stopAsync(); } catch { /* ignore */ }
      try { await toneRef.current.unloadAsync(); } catch { /* ignore */ }
      toneRef.current = null;
    }
  }, []);

  const unloadCue = useCallback(async () => {
    if (cueRef.current) {
      try {
        await cueRef.current.unloadAsync();
      } catch {
        /* ignore */
      }
      cueRef.current = null;
    }
  }, []);

  // Ambient loop
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!ambientEnabled || !isSessionActive || isPaused) {
        await unloadAmbient();
        return;
      }
      await ensureAudioMode();
      if (cancelled) return;
      await unloadAmbient();
      if (cancelled) return;
      try {
        const activeMix = activeAmbientTracks(ambientMix);
        for (const id of activeMix) {
          const module = AMBIENT_SOUND_MODULES[id];
          const volume = AMBIENT_SOUND_VOLUMES[id] * (ambientMix[id] ?? 0);
          const { sound } = await Audio.Sound.createAsync(
            module,
            { isLooping: true, volume },
            (status: AVPlaybackStatus) => {
              if (!status.isLoaded && 'error' in status && status.error) {
                console.warn('Ambient audio error', status.error);
              }
          }
          );
          if (cancelled) {
            await sound.unloadAsync();
            return;
          }
          ambientRefs.current[id] = sound;
          await sound.playAsync();
        }
        // No active mix tracks => stay silent in ambient mode.
      } catch (e) {
        console.warn('Failed to start ambient audio', e);
      }
    })();

    return () => {
      cancelled = true;
      void unloadAmbient();
    };
  }, [ambientEnabled, ambientSoundscape, ambientMix, isSessionActive, isPaused, unloadAmbient]);

  // Tone generator loop
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!toneEnabled || !isSessionActive || isPaused) {
        await unloadTone();
        return;
      }
      await ensureAudioMode();
      if (cancelled) return;
      await unloadTone();
      if (cancelled) return;
      try {
        const fileUri = await ensureToneFile(toneFrequency);
        if (cancelled) return;
        const { sound } = await Audio.Sound.createAsync(
          { uri: fileUri },
          { isLooping: true, volume: toneVolume }
        );
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        toneRef.current = sound;
        await sound.playAsync();
      } catch (e) {
        console.warn('Tone audio error', e);
      }
    })();

    return () => {
      cancelled = true;
      void unloadTone();
    };
  }, [toneEnabled, toneFrequency, isSessionActive, isPaused, unloadTone]);

  // Live-update tone volume without restarting
  useEffect(() => {
    if (!toneRef.current || !toneEnabled) return;
    void toneRef.current.setVolumeAsync(toneVolume).catch(() => {});
  }, [toneVolume, toneEnabled]);

  // Phase cues.
  //
  // `createAsync` + `playAsync` are async, so a fast phase change can leave a
  // previous cue still loading when the next one starts. We guard against that
  // with two mechanisms:
  //   1. A monotonically increasing generation counter. Any async work that
  //      finishes after a newer cue has been scheduled unloads itself instead
  //      of taking over `cueRef`.
  //   2. The effect cleanup sets `cancelled = true` for the in-flight chain,
  //      so rerenders (e.g. session toggled off mid-flight) don't leave an
  //      orphan Sound behind.
  const cueGenerationRef = useRef(0);
  useEffect(() => {
    if (!cuesEnabled || !isSessionActive || isPaused) {
      lastPhaseRef.current = currentPhase;
      return;
    }

    if (lastPhaseRef.current === null) {
      lastPhaseRef.current = currentPhase;
      return;
    }

    if (lastPhaseRef.current === currentPhase) return;
    lastPhaseRef.current = currentPhase;

    const source =
      currentPhase === 'inhale'
        ? inhaleCue
        : currentPhase === 'exhale'
          ? exhaleCue
          : holdCue;

    const generation = ++cueGenerationRef.current;
    let cancelled = false;

    (async () => {
      try {
        await ensureAudioMode();
        if (cancelled || generation !== cueGenerationRef.current) return;
        await unloadCue();
        if (cancelled || generation !== cueGenerationRef.current) return;
        const volume = effectiveCueVolume(soundMode, cueVolume);
        const { sound } = await Audio.Sound.createAsync(source, { volume });
        if (cancelled || generation !== cueGenerationRef.current) {
          void sound.unloadAsync().catch(() => {});
          return;
        }
        cueRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            void sound.unloadAsync().catch(() => {});
            if (cueRef.current === sound) cueRef.current = null;
          }
        });
        await sound.playAsync();
      } catch (e) {
        if (__DEV__) console.warn('Cue audio error', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cuesEnabled, isSessionActive, isPaused, currentPhase, unloadCue, cueVolume, soundMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void unloadAmbient();
      void unloadTone();
      void unloadCue();
    };
  }, [unloadAmbient, unloadTone, unloadCue]);

  // Pause / resume ambient + tone
  useEffect(() => {
    const ambientSounds = Object.values(ambientRefs.current).filter(
      (sound): sound is Audio.Sound => sound != null
    );
    const allLoops = [...ambientSounds, ...(toneRef.current ? [toneRef.current] : [])];
    if (allLoops.length === 0) return;
    if (isPaused) {
      for (const sound of allLoops) {
        void sound.pauseAsync().catch(() => {});
      }
    } else if (isSessionActive) {
      for (const sound of allLoops) {
        void sound.playAsync().catch(() => {});
      }
    }
  }, [isPaused, ambientEnabled, toneEnabled, isSessionActive]);
}
