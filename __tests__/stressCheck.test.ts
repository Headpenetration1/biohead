import { getFreshStressCheck } from '@/utils/stressCheck';

describe('getFreshStressCheck', () => {
  it('keeps stress checks from the same day within four hours', () => {
    const now = new Date('2026-05-06T12:00:00');
    expect(
      getFreshStressCheck(
        { level: 4, updatedAt: '2026-05-06T09:30:00' },
        now
      )?.level
    ).toBe(4);
  });

  it('expires stress checks after four hours', () => {
    const now = new Date('2026-05-06T12:00:00');
    expect(
      getFreshStressCheck(
        { level: 4, updatedAt: '2026-05-06T07:30:00' },
        now
      )
    ).toBeUndefined();
  });

  it('expires stress checks from a previous calendar day', () => {
    const now = new Date('2026-05-06T08:00:00');
    expect(
      getFreshStressCheck(
        { level: 5, updatedAt: '2026-05-05T23:30:00' },
        now
      )
    ).toBeUndefined();
  });
});
