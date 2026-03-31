import { useEffect, useRef, useCallback } from 'react';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import type { SoundMode } from '@/utils/storage';
import type { BreathingPhase } from '@/constants/exercises';

const inhaleCue = require('@/assets/sounds/cue_inhale.wav');
const exhaleCue = require('@/assets/sounds/cue_exhale.wav');
const holdCue = require('@/assets/sounds/cue_hold.wav');
const ambientLoop = require('@/assets/sounds/ambient_loop.wav');

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
  isSessionActive: boolean,
  isPaused: boolean,
  currentPhase: BreathingPhase
) {
  const ambientRef = useRef<Audio.Sound | null>(null);
  const cueRef = useRef<Audio.Sound | null>(null);
  const lastPhaseRef = useRef<BreathingPhase | null>(null);

  useEffect(() => {
    if (!isSessionActive) {
      lastPhaseRef.current = null;
    }
  }, [isSessionActive]);

  const unloadAmbient = useCallback(async () => {
    if (ambientRef.current) {
      try {
        await ambientRef.current.stopAsync();
      } catch {
        /* ignore */
      }
      try {
        await ambientRef.current.unloadAsync();
      } catch {
        /* ignore */
      }
      ambientRef.current = null;
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
      if (soundMode !== 'ambient' || !isSessionActive || isPaused) {
        await unloadAmbient();
        return;
      }
      await ensureAudioMode();
      if (cancelled) return;
      await unloadAmbient();
      if (cancelled) return;
      try {
        const { sound } = await Audio.Sound.createAsync(
          ambientLoop,
          { isLooping: true, volume: 0.35 },
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
        ambientRef.current = sound;
        await sound.playAsync();
      } catch (e) {
        console.warn('Failed to start ambient audio', e);
      }
    })();

    return () => {
      cancelled = true;
      void unloadAmbient();
    };
  }, [soundMode, isSessionActive, isPaused, unloadAmbient]);

  // Phase cues
  useEffect(() => {
    if (soundMode !== 'cues' || !isSessionActive || isPaused) {
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
        const { sound } = await Audio.Sound.createAsync(source, { volume: 0.55 });
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
  }, [soundMode, isSessionActive, isPaused, currentPhase, unloadCue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void unloadAmbient();
      void unloadCue();
    };
  }, [unloadAmbient, unloadCue]);

  // Pause / resume ambient volume
  useEffect(() => {
    if (!ambientRef.current) return;
    if (isPaused) {
      void ambientRef.current.pauseAsync().catch(() => {});
    } else if (soundMode === 'ambient' && isSessionActive) {
      void ambientRef.current.playAsync().catch(() => {});
    }
  }, [isPaused, soundMode, isSessionActive]);
}
