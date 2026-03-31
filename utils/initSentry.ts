import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Call once at app startup. No-op if EXPO_PUBLIC_SENTRY_DSN is unset.
 */
export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
  });
}
