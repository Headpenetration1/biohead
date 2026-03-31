import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isHapticsSupported = Platform.OS !== 'web';

function safeHaptic(fn: () => Promise<void>) {
  if (!isHapticsSupported) return;
  try { fn(); } catch { }
}

export function useHaptics() {
  const light = useCallback(() => {
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }, []);

  const medium = useCallback(() => {
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  }, []);

  const heavy = useCallback(() => {
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  }, []);

  const success = useCallback(() => {
    safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }, []);

  const selection = useCallback(() => {
    safeHaptic(() => Haptics.selectionAsync());
  }, []);

  return { light, medium, heavy, success, selection };
}
