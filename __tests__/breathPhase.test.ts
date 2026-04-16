import { computePhaseSnapshot } from '@/utils/breathPhase';
import type { BreathingPattern } from '@/constants/exercises';

const boxPattern: BreathingPattern[] = [
  { phase: 'inhale', duration: 4, label: 'Pust inn' },
  { phase: 'hold', duration: 4, label: 'Hold' },
  { phase: 'exhale', duration: 4, label: 'Pust ut' },
  { phase: 'holdOut', duration: 4, label: 'Hvil' },
];

describe('computePhaseSnapshot', () => {
  it('returns first phase at t=0', () => {
    const snap = computePhaseSnapshot(boxPattern, 0);
    expect(snap.phase).toBe('inhale');
    expect(snap.stepIndex).toBe(0);
    expect(snap.progress).toBe(0);
  });

  it('reports progress halfway through a phase', () => {
    const snap = computePhaseSnapshot(boxPattern, 2);
    expect(snap.phase).toBe('inhale');
    expect(snap.progress).toBeCloseTo(0.5, 5);
  });

  it('transitions into the next phase just past the boundary', () => {
    const snap = computePhaseSnapshot(boxPattern, 4.0001);
    expect(snap.phase).toBe('hold');
    expect(snap.stepIndex).toBe(1);
  });

  it('advances through all four steps within one cycle', () => {
    expect(computePhaseSnapshot(boxPattern, 1).phase).toBe('inhale');
    expect(computePhaseSnapshot(boxPattern, 5).phase).toBe('hold');
    expect(computePhaseSnapshot(boxPattern, 9).phase).toBe('exhale');
    expect(computePhaseSnapshot(boxPattern, 13).phase).toBe('holdOut');
  });

  it('wraps back to inhale on the next cycle', () => {
    // Cycle length = 16 seconds.
    const snap = computePhaseSnapshot(boxPattern, 16.5);
    expect(snap.phase).toBe('inhale');
    expect(snap.progress).toBeCloseTo(0.5 / 4, 5);
  });

  it('handles non-uniform phase durations', () => {
    const triangle: BreathingPattern[] = [
      { phase: 'inhale', duration: 4, label: 'Pust inn' },
      { phase: 'hold', duration: 7, label: 'Hold' },
      { phase: 'exhale', duration: 8, label: 'Pust ut' },
    ];
    expect(computePhaseSnapshot(triangle, 3).phase).toBe('inhale');
    expect(computePhaseSnapshot(triangle, 4).phase).toBe('hold');
    expect(computePhaseSnapshot(triangle, 10).phase).toBe('hold');
    expect(computePhaseSnapshot(triangle, 11).phase).toBe('exhale');
    expect(computePhaseSnapshot(triangle, 18).phase).toBe('exhale');
    // Cycle length = 19 – after 19s we are back at inhale.
    expect(computePhaseSnapshot(triangle, 19).phase).toBe('inhale');
  });

  it('clamps negative elapsed time to zero (defensive)', () => {
    const snap = computePhaseSnapshot(boxPattern, -5);
    expect(snap.phase).toBe('inhale');
    expect(snap.progress).toBe(0);
  });

  it('returns a safe fallback for empty patterns', () => {
    const snap = computePhaseSnapshot([], 3);
    expect(snap.phase).toBe('inhale');
    expect(snap.stepIndex).toBe(0);
    expect(snap.progress).toBe(0);
  });

  it('returns a safe fallback when total cycle duration is zero', () => {
    const zero: BreathingPattern[] = [
      { phase: 'inhale', duration: 0, label: 'Pust inn' },
    ];
    const snap = computePhaseSnapshot(zero, 2);
    expect(snap.phase).toBe('inhale');
    expect(snap.progress).toBe(0);
  });
});
