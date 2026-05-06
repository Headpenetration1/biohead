/**
 * Looping backgrounds for "Ambient" sound mode (exercise session).
 * Files live in assets/sounds/ — see scripts/generate-ambient-sounds.py
 */
export type AmbientSoundscape =
  | 'neutral'
  | 'wind'
  | 'birds'
  | 'forest'
  | 'rain'
  | 'waves';

export type AmbientMix = Record<AmbientSoundscape, number>;

export const AMBIENT_SOUNDSCAPE_IDS: AmbientSoundscape[] = [
  'neutral',
  'wind',
  'birds',
  'forest',
  'rain',
  'waves',
];

/** Metro requires static require() per file */
export const AMBIENT_SOUND_MODULES: Record<AmbientSoundscape, number> = {
  neutral: require('@/assets/sounds/ambient_neutral.mp3'),
  wind: require('@/assets/sounds/ambient_wind.wav'),
  birds: require('@/assets/sounds/ambient_birds.wav'),
  forest: require('@/assets/sounds/ambient_forest.wav'),
  rain: require('@/assets/sounds/ambient_rain.wav'),
  waves: require('@/assets/sounds/ambient_waves.mp3'),
};

/** Suggested playback volume per soundscape (0–1) */
export const AMBIENT_SOUND_VOLUMES: Record<AmbientSoundscape, number> = {
  neutral: 0.32,
  wind: 0.38,
  birds: 0.28,
  forest: 0.34,
  rain: 0.36,
  waves: 0.33,
};

export const AMBIENT_SOUNDSCAPE_OPTIONS: {
  id: AmbientSoundscape;
  label: string;
  sub: string;
}[] = [
  { id: 'neutral', label: 'Myk tone', sub: 'Rolig, abstrakt bakgrunn' },
  { id: 'wind', label: 'Vind', sub: 'Myk vind i bakgrunnen' },
  { id: 'birds', label: 'Fugler', sub: 'Lette fuglelyder' },
  { id: 'forest', label: 'Skog', sub: 'Vind og sporadiske fugl' },
  { id: 'rain', label: 'Regn', sub: 'Mild regn på tak' },
  { id: 'waves', label: 'Bølger', sub: 'Rolig hav' },
];

export const DEFAULT_AMBIENT_MIX: AmbientMix = {
  neutral: 0,
  wind: 1,
  birds: 0,
  forest: 0,
  rain: 0,
  waves: 0,
};
