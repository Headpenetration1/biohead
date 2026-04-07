import { useEffect, useRef, useCallback } from 'react';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import type { SoundMode } from '@/utils/storage';
import type { BreathingPhase } from '@/constants/exercises';
import {
  type AmbientMix,
  type AmbientSoundscape,
  AMBIENT_SOUND_MODULES,
  AMBIENT_SOUND_VOLUMES,
  AMBIENT_SOUNDSCAPE_IDS,
} from '@/constants/ambientSounds';

const inhaleCue = require('@/assets/sounds/cue_inhale.wav');
const exhaleCue = require('@/assets/sounds/cue_exhale.wav');
const holdCue = require('@/assets/sounds/cue_hold.wav');

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

export function useBreathAudio(
  soundMode: SoundMode,
  cueVolume: number,
  ambientSoundscape: AmbientSoundscape,
  ambientMix: AmbientMix,
  isSessionActive: boolean,
  isPaused: boolean,
  currentPhase: BreathingPhase
) {
  const ambientEnabled = soundMode === 'ambient' || soundMode === 'mix';
  const cuesEnabled = (soundMode === 'cues' || soundMode === 'mix') && cueVolume > 0.01;
  const ambientRefs = useRef<Partial<Record<AmbientSoundscape, Audio.Sound>>>({});
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
        const activeMix = AMBIENT_SOUNDSCAPE_IDS.filter(
          (id) => (ambientMix[id] ?? 0) > 0.01
        );
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

  // Phase cues
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

    (async () => {
      await ensureAudioMode();
      await unloadCue();
      try {
        const effectiveCueVolume =
          soundMode === 'mix' ? Math.min(1, Math.max(0.05, cueVolume) * 1.2) : cueVolume;
        const { sound } = await Audio.Sound.createAsync(source, { volume: effectiveCueVolume });
        cueRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            void sound.unloadAsync();
            if (cueRef.current === sound) cueRef.current = null;
          }
        });
        await sound.playAsync();
      } catch (e) {
        console.warn('Cue audio error', e);
      }
    })();
  }, [cuesEnabled, isSessionActive, isPaused, currentPhase, unloadCue, cueVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void unloadAmbient();
      void unloadCue();
    };
  }, [unloadAmbient, unloadCue]);

  // Pause / resume ambient volume
  useEffect(() => {
    const sounds = Object.values(ambientRefs.current).filter(
      (sound): sound is Audio.Sound => sound != null
    );
    if (sounds.length === 0) return;
    if (isPaused) {
      for (const sound of sounds) {
        void sound.pauseAsync().catch(() => {});
      }
    } else if (ambientEnabled && isSessionActive) {
      for (const sound of sounds) {
        void sound.playAsync().catch(() => {});
      }
    }
  }, [isPaused, ambientEnabled, isSessionActive]);
}
