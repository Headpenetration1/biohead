import { getProgramById, PROGRAMS } from '@/constants/programs';

describe('program definitions', () => {
  it('contains multiple programs with valid day plans', () => {
    expect(PROGRAMS.length).toBeGreaterThanOrEqual(3);
    for (const program of PROGRAMS) {
      expect(program.days.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('looks up program by id', () => {
    const calm = getProgramById('calm7');
    expect(calm?.title).toContain('7 dager');
    expect(getProgramById('unknown')).toBeUndefined();
  });
});
