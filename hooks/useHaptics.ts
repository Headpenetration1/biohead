import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isHapticsSupported = Platform.OS !== 'web';

// Swallow both synchronous throws AND promise rejections. Haptics is a purely
// cosmetic API – we never want a dropped rumble to surface as an unhandled
// rejection or Metro's red screen.
function safeHaptic(fn: () => Promise<void>) {
  if (!isHapticsSupported) return;
  try {
    fn().catch(() => {
      /* ignore rejection */
    });
  } catch {
    /* ignore synchronous throw */
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
