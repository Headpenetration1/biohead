import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAppData } from '@/utils/storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const storageMock = AsyncStorage as unknown as {
  getItem: jest.Mock<Promise<string | null>, [string]>;
};

describe('loadAppData', () => {
  beforeEach(() => {
    storageMock.getItem.mockReset();
  });

  it('falls back safely when sessions/favorites are malformed', async () => {
    storageMock.getItem.mockResolvedValue(
      JSON.stringify({
        favorites: { not: 'an array' },
        sessions: { not: 'an array' },
      })
    );

    const data = await loadAppData();

    expect(data.favorites).toEqual([]);
    expect(data.sessions).toEqual([]);
  });

  it('keeps valid session entries and sanitizes optional values', async () => {
    storageMock.getItem.mockResolvedValue(
      JSON.stringify({
        favorites: ['calm', 'calm', ' focus ', 2],
        sessions: [
          {
            id: 'ok-1',
            exerciseId: 'calm',
            duration: 125.4,
            completedAt: '2026-04-01T10:00:00.000Z',
            stressBefore: 8,
            effectScore: 0,
            ambientSoundscape: 'forest',
          },
          {
            id: 'bad-1',
            exerciseId: 'focus',
            duration: 60,
            completedAt: 'not-a-date',
          },
          {
            exerciseId: 'focus',
            duration: 60,
            completedAt: '2026-04-01T10:00:00.000Z',
          },
        ],
      })
    );

    const data = await loadAppData();

    expect(data.favorites).toEqual(['calm', 'focus']);
    expect(data.sessions).toEqual([
      {
        id: 'ok-1',
        exerciseId: 'calm',
        duration: 125,
        completedAt: '2026-04-01T10:00:00.000Z',
        stressBefore: 5,
        effectScore: 1,
        ambientSoundscape: 'forest',
      },
    ]);
  });
});
