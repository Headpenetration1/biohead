import { Audio, type AVPlaybackStatus } from 'expo-av';
import {
  AMBIENT_SOUNDSCAPE_IDS,
  AMBIENT_SOUND_MODULES,
  AMBIENT_SOUND_VOLUMES,
  type AmbientMix,
  type AmbientSoundscape,
} from '@/constants/ambientSounds';

export type AmbientSoundMap = Partial<Record<AmbientSoundscape, Audio.Sound>>;

const VOLUME_FADE_MS = 160;
const VOLUME_FADE_STEPS = 4;

export function ambientTargetVolume(mix: AmbientMix, id: AmbientSoundscape): number {
  return AMBIENT_SOUND_VOLUMES[id] * Math.max(0, Math.min(1, mix[id] ?? 0));
}

export async function fadeSoundVolume(
  sound: Audio.Sound,
  targetVolume: number,
  durationMs = VOLUME_FADE_MS
): Promise<void> {
  const status = await sound.getStatusAsync();
  const startVolume = status.isLoaded && typeof status.volume === 'number' ? status.volume : targetVolume;
  const safeTarget = Math.max(0, Math.min(1, targetVolume));
  if (Math.abs(startVolume - safeTarget) < 0.005) {
    await sound.setVolumeAsync(safeTarget);
    return;
  }

  for (let step = 1; step <= VOLUME_FADE_STEPS; step += 1) {
    const progress = step / VOLUME_FADE_STEPS;
    const nextVolume = startVolume + (safeTarget - startVolume) * progress;
    await sound.setVolumeAsync(nextVolume);
    if (step < VOLUME_FADE_STEPS) {
      await new Promise((resolve) => setTimeout(resolve, durationMs / VOLUME_FADE_STEPS));
    }
  }
}

/**
 * Reconcile the loaded sounds with the set of tracks that should be audible.
 * Tracks not in `active` are stopped and unloaded so we never keep idle decoders
 * alive on silent soundscapes; missing active tracks are loaded silent (volume 0)
 * and faded to their target by applyAmbientMix.
 */
export async function ensureAmbientSounds(
  refs: AmbientSoundMap,
  active: AmbientSoundscape[],
  onStatus?: (id: AmbientSoundscape, status: AVPlaybackStatus) => void
): Promise<void> {
  const activeSet = new Set(active);

  for (const id of AMBIENT_SOUNDSCAPE_IDS) {
    const sound = refs[id];
    if (!sound || activeSet.has(id)) continue;
    delete refs[id];
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

  for (const id of active) {
    if (refs[id]) continue;
    const { sound } = await Audio.Sound.createAsync(
      AMBIENT_SOUND_MODULES[id],
      { isLooping: true, volume: 0 },
      onStatus ? (status) => onStatus(id, status) : undefined
    );
    refs[id] = sound;
  }
}

export async function applyAmbientMix(
  refs: AmbientSoundMap,
  mix: AmbientMix,
  fade = true
): Promise<void> {
  await Promise.all(
    AMBIENT_SOUNDSCAPE_IDS.map(async (id) => {
      const sound = refs[id];
      if (!sound) return;
      const volume = ambientTargetVolume(mix, id);
      if (fade) {
        await fadeSoundVolume(sound, volume);
      } else {
        await sound.setVolumeAsync(volume);
      }
    })
  );
}

export async function playAmbientSounds(refs: AmbientSoundMap): Promise<void> {
  await Promise.all(
    Object.values(refs).map(async (sound) => {
      if (!sound) return;
      const status = await sound.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        await sound.playAsync();
      }
    })
  );
}

export async function pauseAmbientSounds(refs: AmbientSoundMap): Promise<void> {
  await Promise.all(
    Object.values(refs).map((sound) => sound?.pauseAsync().catch(() => undefined))
  );
}

export async function unloadAmbientSounds(refs: AmbientSoundMap): Promise<void> {
  const sounds = Object.values(refs).filter((sound): sound is Audio.Sound => sound != null);
  for (const id of AMBIENT_SOUNDSCAPE_IDS) {
    delete refs[id];
  }
  await Promise.all(
    sounds.map(async (sound) => {
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
    })
  );
}
