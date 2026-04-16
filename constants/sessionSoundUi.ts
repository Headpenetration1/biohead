import type { SoundMode } from '@/utils/storage';

export const SOUND_MODE_CYCLE: SoundMode[] = ['off', 'ambient', 'cues', 'mix'];

export const SOUND_MODE_LABEL: Record<SoundMode, string> = {
  off: '🔇',
  cues: '🔔',
  ambient: '🌿',
  mix: '🎵',
};

/** Korte, lesbare norsk-etiketter (synlig på økt- og øvelsesside). */
export const SOUND_MODE_TITLE: Record<SoundMode, string> = {
  off: 'Av',
  ambient: 'Kun naturlyd',
  cues: 'Kun signaler',
  mix: 'Naturlyd + signaler',
};

export function getNextSoundMode(current: SoundMode): SoundMode {
  const idx = SOUND_MODE_CYCLE.indexOf(current);
  return SOUND_MODE_CYCLE[(idx + 1) % SOUND_MODE_CYCLE.length];
}

export function buildSoundCycleAccessibilityLabel(
  soundMode: SoundMode,
  toneEnabled: boolean,
  toneFrequency: number
): string {
  return [
    `Lyd: ${SOUND_MODE_TITLE[soundMode]}.`,
    toneEnabled
      ? `Droningtone er på, cirka ${Math.round(toneFrequency)} hertz.`
      : 'Droningtone er av.',
    'Trykk for neste lydmodus.',
  ].join(' ');
}
