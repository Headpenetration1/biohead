import { formatTime } from '@/utils/formatTime';

describe('formatTime', () => {
  it('formats seconds only', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('pads minutes', () => {
    expect(formatTime(125)).toBe('2:05');
  });

  it('handles zero', () => {
    expect(formatTime(0)).toBe('0:00');
  });
});
