import type { SoundMode } from '@/utils/storage';
import {
  AMBIENT_SOUNDSCAPE_IDS,
  type AmbientMix,
  type AmbientSoundscape,
} from '@/constants/ambientSounds';

/**
 * Pure helpers that decide *what* the breath-audio hook should play, based on
 * user settings. Extracted so the behaviour is unit-testable without mocking
 * expo-av, and so regressions (e.g. "cues stopped playing when soundMode is
 * 'mix'") are caught by CI.
 */

/** Minimum non-zero volume before we consider a track silent. */
export const AUDIO_SILENCE_THRESHOLD = 0.01;

export function isAmbientEnabled(soundMode: SoundMode): boolean {
  return soundMode === 'ambient' || soundMode === 'mix';
}

export function areCuesEnabled(soundMode: SoundMode, cueVolume: number): boolean {
  return (soundMode === 'cues' || soundMode === 'mix') && cueVolume > AUDIO_SILENCE_THRESHOLD;
}

/**
 * Return the ambient tracks that should actually be loaded based on the user's
 * per-track mix levels. Tracks at ~0 volume are skipped so we don't waste
 * decoders on silence.
 */
export function activeAmbientTracks(mix: AmbientMix): AmbientSoundscape[] {
  return AMBIENT_SOUNDSCAPE_IDS.filter((id) => (mix[id] ?? 0) > AUDIO_SILENCE_THRESHOLD);
}

/**
 * In "mix" mode the ambient layer can mask quiet cues, so we nudge the cue
 * volume up slightly and enforce a soft floor. In pure "cues" mode we respect
 * the raw slider value.
 */
export function effectiveCueVolume(soundMode: SoundMode, cueVolume: number): number {
  if (soundMode !== 'mix') return cueVolume;
  return Math.min(1, Math.max(0.05, cueVolume) * 1.2);
}
