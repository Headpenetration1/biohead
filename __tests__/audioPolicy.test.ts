import {
  activeAmbientTracks,
  areCuesEnabled,
  effectiveCueVolume,
  isAmbientEnabled,
} from '@/utils/audioPolicy';
import type { AmbientMix } from '@/constants/ambientSounds';

const emptyMix: AmbientMix = {
  neutral: 0,
  wind: 0,
  birds: 0,
  forest: 0,
  rain: 0,
  waves: 0,
};

describe('audioPolicy', () => {
  describe('isAmbientEnabled', () => {
    it('is true for ambient and mix modes', () => {
      expect(isAmbientEnabled('ambient')).toBe(true);
      expect(isAmbientEnabled('mix')).toBe(true);
    });

    it('is false for cues-only and silent modes', () => {
      expect(isAmbientEnabled('cues')).toBe(false);
      expect(isAmbientEnabled('off')).toBe(false);
    });
  });

  describe('areCuesEnabled', () => {
    it('is true for cues and mix modes when volume is audible', () => {
      expect(areCuesEnabled('cues', 0.5)).toBe(true);
      expect(areCuesEnabled('mix', 0.5)).toBe(true);
    });

    it('is false for ambient and off modes regardless of volume', () => {
      expect(areCuesEnabled('ambient', 1)).toBe(false);
      expect(areCuesEnabled('off', 1)).toBe(false);
    });

    it('is false when volume is effectively silent', () => {
      expect(areCuesEnabled('cues', 0)).toBe(false);
      expect(areCuesEnabled('cues', 0.005)).toBe(false);
      expect(areCuesEnabled('mix', 0.01)).toBe(false);
    });
  });

  describe('activeAmbientTracks', () => {
    it('returns no tracks when mix is silent', () => {
      expect(activeAmbientTracks(emptyMix)).toEqual([]);
    });

    it('returns only tracks above the silence threshold', () => {
      expect(
        activeAmbientTracks({
          ...emptyMix,
          wind: 0.3,
          rain: 0,
          birds: 0.005,
        })
      ).toEqual(['wind']);
    });

    it('preserves canonical id order', () => {
      expect(
        activeAmbientTracks({
          ...emptyMix,
          waves: 0.4,
          neutral: 0.4,
          forest: 0.4,
        })
      ).toEqual(['neutral', 'forest', 'waves']);
    });
  });

  describe('effectiveCueVolume', () => {
    it('returns raw volume for non-mix modes', () => {
      expect(effectiveCueVolume('cues', 0.3)).toBeCloseTo(0.3);
      expect(effectiveCueVolume('ambient', 0.3)).toBeCloseTo(0.3);
      expect(effectiveCueVolume('off', 0.3)).toBeCloseTo(0.3);
    });

    it('enforces a soft floor in mix mode', () => {
      expect(effectiveCueVolume('mix', 0)).toBeCloseTo(0.06, 2);
      expect(effectiveCueVolume('mix', 0.02)).toBeCloseTo(0.06, 2);
    });

    it('boosts cues by 20% in mix mode', () => {
      expect(effectiveCueVolume('mix', 0.5)).toBeCloseTo(0.6, 5);
    });

    it('never exceeds 1.0', () => {
      expect(effectiveCueVolume('mix', 0.9)).toBeLessThanOrEqual(1);
      expect(effectiveCueVolume('mix', 1)).toBe(1);
    });
  });
});
