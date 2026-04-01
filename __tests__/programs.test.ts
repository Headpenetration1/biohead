import { getProgramById, PROGRAMS } from '@/constants/programs';

describe('program definitions', () => {
  it('contains three 7-day programs', () => {
    expect(PROGRAMS).toHaveLength(3);
    for (const program of PROGRAMS) {
      expect(program.days).toHaveLength(7);
    }
  });

  it('looks up program by id', () => {
    const calm = getProgramById('calm7');
    expect(calm?.title).toContain('7 dager');
    expect(getProgramById('unknown')).toBeUndefined();
  });
});
