import { exercises } from '@/constants/exercises';
import { getAdaptiveRecommendation } from '@/utils/recommendation';

describe('adaptive recommendation with stress check', () => {
  it('prefers destress when stress is high', () => {
    const rec = getAdaptiveRecommendation({
      sessions: [],
      exercises,
      goal: undefined,
      stressLevel: 5,
      now: new Date('2026-03-31T13:00:00.000Z'),
    });
    expect(rec?.exerciseId).toBe('destress');
  });

  it('prefers focus when stress is low in daytime', () => {
    const rec = getAdaptiveRecommendation({
      sessions: [],
      exercises,
      goal: undefined,
      stressLevel: 1,
      now: new Date('2026-03-31T10:00:00.000Z'),
    });
    expect(rec?.exerciseId).toBe('focus');
  });
});
