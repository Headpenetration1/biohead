import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReminderTime, SessionRecord } from '@/utils/storage';
import { getToday } from '@/utils/formatTime';

const ANDROID_CHANNEL_ID = 'biohead-daily';
const REMINDER_CATEGORY_ID = 'biohead-reminder-actions';
const DAILY_REMINDER_ID_PREFIX = 'biohead-daily-';
const ACTION_SNOOZE_30 = 'snooze-30-min';
const ACTION_SKIP_TODAY = 'skip-today';
const SKIP_TODAY_KEY = '@biohead_reminder_skip_today';

let reminderActionsInitialized = false;

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function shouldSkipToday(): Promise<boolean> {
  const skippedDate = await AsyncStorage.getItem(SKIP_TODAY_KEY);
  return skippedDate === getLocalDateKey();
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const kind = notification.request.content.data?.reminderKind;
    const hideDailyReminder = kind === 'daily' && (await shouldSkipToday());
    return {
      shouldShowBanner: !hideDailyReminder,
      shouldShowList: !hideDailyReminder,
      shouldPlaySound: !hideDailyReminder,
      shouldSetBadge: false,
    };
  },
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daglig påminnelse',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#46917c',
  });
}

async function ensureReminderCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
    {
      identifier: ACTION_SNOOZE_30,
      buttonTitle: 'Utsett 30 min',
    },
    {
      identifier: ACTION_SKIP_TODAY,
      buttonTitle: 'Hopp over i dag',
    },
  ]);
}

async function scheduleSnoozeReminder(minutes: number): Promise<void> {
  const triggerAt = new Date(Date.now() + minutes * 60 * 1000);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Biohead',
      body: 'Tid for en rolig pustepause.',
      sound: 'default',
      data: { reminderKind: 'snooze' },
      categoryIdentifier: REMINDER_CATEGORY_ID,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });
}

export function initReminderActions(): void {
  if (reminderActionsInitialized) return;
  reminderActionsInitialized = true;
  void ensureReminderCategory();
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const actionId = response.actionIdentifier;
    if (actionId === ACTION_SNOOZE_30) {
      await ensureAndroidChannel();
      await scheduleSnoozeReminder(30);
      return;
    }
    if (actionId === ACTION_SKIP_TODAY) {
      await AsyncStorage.setItem(SKIP_TODAY_KEY, getLocalDateKey());
    }
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

export function getAdaptiveReminderTimes(
  sessions: SessionRecord[],
  fallbackTimes: ReminderTime[]
): ReminderTime[] {
  if (sessions.length < 5) return normalizeReminderTimes(fallbackTimes);
  const last21 = [...sessions]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 21);
  if (last21.length === 0) return normalizeReminderTimes(fallbackTimes);
  const hourCounts = new Map<number, number>();
  for (const session of last21) {
    const hour = new Date(session.completedAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const sortedHours = [...hourCounts.entries()].sort((a, b) => b[1] - a[1]);
  const preferredHour = sortedHours[0]?.[0];
  if (preferredHour == null) return normalizeReminderTimes(fallbackTimes);

  // Rather than always firing at minute 0, use the median minute among
  // sessions that actually landed in the preferred hour. That way a user who
  // consistently breathes at 07:20 doesn't get nudged at 07:00 on the dot.
  // We snap to the nearest 5 minutes to avoid distracting precision.
  const minutesInPreferredHour = last21
    .map((session) => new Date(session.completedAt))
    .filter((d) => d.getHours() === preferredHour)
    .map((d) => d.getMinutes())
    .sort((a, b) => a - b);
  let minute = 0;
  if (minutesInPreferredHour.length > 0) {
    const mid = Math.floor(minutesInPreferredHour.length / 2);
    const medianMinute = minutesInPreferredHour[mid];
    minute = Math.max(0, Math.min(55, Math.round(medianMinute / 5) * 5));
  }
  const preferred: ReminderTime = { hour: preferredHour, minute };
  return [preferred];
}

async function cancelBioheadDailyReminders(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const ours = all.filter((n) => n.identifier.startsWith(DAILY_REMINDER_ID_PREFIX));
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function syncDailyReminder(
  enabled: boolean,
  reminderTimes: ReminderTime[],
  options?: {
    adaptiveEnabled?: boolean;
    sessions?: SessionRecord[];
    quietWeekends?: boolean;
    skipIfDoneToday?: boolean;
    lastSessionDate?: string;
  }
): Promise<void> {
  await cancelBioheadDailyReminders();
  if (!enabled) return;
  if (await shouldSkipToday()) return;
  if (options?.skipIfDoneToday && options.lastSessionDate === getToday()) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await ensureAndroidChannel();
  await ensureReminderCategory();
  const times =
    options?.adaptiveEnabled && options.sessions
      ? getAdaptiveReminderTimes(options.sessions, reminderTimes)
      : normalizeReminderTimes(reminderTimes);
  if (times.length === 0) return;

  let idCounter = 0;
  for (const reminder of times) {
    if (options?.quietWeekends) {
      for (const weekday of [2, 3, 4, 5, 6]) {
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: `${DAILY_REMINDER_ID_PREFIX}${idCounter++}`,
            content: {
              title: 'Biohead',
              body: 'Ta en kort pustepause – du fortjener det.',
              sound: 'default',
              data: { reminderKind: 'daily' },
              categoryIdentifier: REMINDER_CATEGORY_ID,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday,
              hour: reminder.hour,
              minute: reminder.minute,
              ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
            },
          });
        } catch (error) {
          if (__DEV__) {
            console.warn('scheduleNotificationAsync (weekly) failed', error);
          }
        }
      }
      continue;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${DAILY_REMINDER_ID_PREFIX}${idCounter++}`,
        content: {
          title: 'Biohead',
          body: 'Ta en kort pustepause – du fortjener det.',
          sound: 'default',
          data: { reminderKind: 'daily' },
          categoryIdentifier: REMINDER_CATEGORY_ID,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminder.hour,
          minute: reminder.minute,
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('scheduleNotificationAsync (daily) failed', error);
      }
    }
  }
}
