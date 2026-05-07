export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDurationShort(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  if (safeSeconds < 60) return `${safeSeconds} s`;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  if (remainingSeconds === 0) return `${minutes} min`;
  return `${minutes} min ${remainingSeconds} s`;
}

export function formatDurationAccessible(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  if (safeSeconds < 60) return `${safeSeconds} sekunder`;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  const minuteText = `${minutes} minutt${minutes === 1 ? '' : 'er'}`;
  if (remainingSeconds === 0) return minuteText;
  return `${minuteText} og ${remainingSeconds} sekunder`;
}

// Returns YYYY-MM-DD in the device's local timezone. We avoid toISOString() here
// because it converts to UTC, which can make a session logged just before
// midnight locally appear on the "next" day and break streak/history grouping
// for users outside UTC.
export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getToday(): string {
  return toLocalDateKey(new Date());
}

export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateKey(d);
}
