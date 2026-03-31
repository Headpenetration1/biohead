import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isHapticsSupported = Platform.OS !== 'web';

function safeHaptic(fn: () => Promise<void>) {
  if (!isHapticsSupported) return;
  try {
    void fn();
  } catch {
    /* ignore */
  }
}

export function useHaptics(enabled = true) {
  const light = useCallback(() => {
    if (!enabled) return;
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }, [enabled]);

  const medium = useCallback(() => {
    if (!enabled) return;
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  }, [enabled]);

  const heavy = useCallback(() => {
    if (!enabled) return;
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  }, [enabled]);

  const success = useCallback(() => {
    if (!enabled) return;
    safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }, [enabled]);

  const selection = useCallback(() => {
    if (!enabled) return;
    safeHaptic(() => Haptics.selectionAsync());
  }, [enabled]);

  return { light, medium, heavy, success, selection };
}
