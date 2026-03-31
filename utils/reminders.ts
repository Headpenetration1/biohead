import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ReminderTime } from '@/utils/storage';
import { getToday } from '@/utils/formatTime';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = 'biohead-daily';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daglig påminnelse',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#46917c',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function normalizeReminderTimes(times: ReminderTime[]): ReminderTime[] {
  const unique = times.filter(
    (time, idx, arr) =>
      arr.findIndex((candidate) => candidate.hour === time.hour && candidate.minute === time.minute) === idx
  );
  return unique
    .map((time) => ({
      hour: Math.max(0, Math.min(23, Math.round(time.hour))),
      minute: Math.max(0, Math.min(59, Math.round(time.minute))),
    }))
    .sort((a, b) => a.hour - b.hour || a.minute - b.minute);
}

/**
 * Cancels all scheduled notifications and, if enabled, schedules one or more daily local notifications.
 */
export async function syncDailyReminder(
  enabled: boolean,
  reminderTimes: ReminderTime[],
  options?: {
    quietWeekends?: boolean;
    skipIfDoneToday?: boolean;
    lastSessionDate?: string;
  }
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  if (options?.skipIfDoneToday && options.lastSessionDate === getToday()) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await ensureAndroidChannel();
  const times = normalizeReminderTimes(reminderTimes);
  if (times.length === 0) return;

  for (const reminder of times) {
    if (options?.quietWeekends) {
      for (const weekday of [2, 3, 4, 5, 6]) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Biohead',
            body: 'Ta en kort pustepause – du fortjener det.',
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: reminder.hour,
            minute: reminder.minute,
            ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
          },
        });
      }
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Biohead',
        body: 'Ta en kort pustepause – du fortjener det.',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
  }
}
