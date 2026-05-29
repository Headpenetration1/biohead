/**
 * Central logger used across the app so we have exactly one place to change
 * behaviour for production builds.
 *
 * - `devWarn` prints to console only in development. Use it for non-actionable
 *   warnings (failed cosmetic audio cleanup, UI preview hiccups) where we
 *   don't want to spam the Metro red-screen.
 * - `reportError` logs to console in development. Use it for failures that
 *   actually degrade the user's experience (persistence errors, HealthKit
 *   sync failures, widget bridge failures). Wire up a crash-reporting backend
 *   here if one is added later.
 */

export function devWarn(message: string, ...details: unknown[]): void {
  if (__DEV__) {
    console.warn(message, ...details);
  }
}

export function reportError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (__DEV__) {
    console.warn(message, error, context ?? '');
  }
}
