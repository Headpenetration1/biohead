import { File, Paths } from 'expo-file-system';

const TONE_SAMPLE_RATE = 44100;
const TONE_DURATION_TARGET_SECONDS = 30;

export const TONE_PRESETS = [100, 157, 432, 528, 741];

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function buildSineWavBytes(frequencyHz: number): Uint8Array {
  const freq = Math.max(40, Math.min(1000, Math.round(frequencyHz)));
  const cycles = Math.max(1, Math.round(freq * TONE_DURATION_TARGET_SECONDS));
  const sampleCount = Math.max(2, Math.round((TONE_SAMPLE_RATE * cycles) / freq));
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TONE_SAMPLE_RATE, true);
  view.setUint32(28, TONE_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const phaseCycles = 2 * Math.PI * cycles;
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / (sampleCount - 1);
    const sample = Math.sin(phaseCycles * t);
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, Math.round(clamped * 32767), true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

export async function ensureToneFile(frequencyHz: number): Promise<string> {
  const normalized = Math.max(40, Math.min(1000, Math.round(frequencyHz)));
  const file = new File(Paths.cache, `tone-${normalized}.wav`);
  if (file.exists) {
    return file.uri;
  }
  try {
    const bytes = buildSineWavBytes(normalized);
    file.create({ overwrite: true });
    file.write(bytes);
    return file.uri;
  } catch (error) {
    if (__DEV__) {
      console.warn('ensureToneFile failed', error);
    }
    throw error;
  }
}
