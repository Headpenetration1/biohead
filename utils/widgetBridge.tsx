import React from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { WidgetSnapshot } from '@/utils/storage';
import { exercises } from '@/constants/exercises';

function exerciseTitle(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return exercises.find((e) => e.id === id)?.title;
}

let androidRegistered = false;
// The Android task handler is registered exactly once, so it must read the
// latest snapshot via this module-level ref instead of capturing one in
// closure. Otherwise background widget renders get stuck on whatever snapshot
// was current the very first time the user opened the app.
let latestAndroidSnapshot: WidgetSnapshot | null = null;
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  String(Constants.executionEnvironment).toLowerCase() === 'storeclient';

function getDeepLink(snapshot: WidgetSnapshot): string {
  const exerciseId = snapshot.recommendedExerciseId ?? snapshot.lastSessionExerciseId;
  if (exerciseId) return `biohead://exercise/${exerciseId}`;
  return 'biohead://';
}

function setupAndroidWidget(snapshot: WidgetSnapshot): void {
  if (Platform.OS !== 'android') return;
  latestAndroidSnapshot = snapshot;
  try {
    const widget = require('react-native-android-widget') as typeof import('react-native-android-widget');

    if (!androidRegistered) {
      widget.registerWidgetTaskHandler(async ({ renderWidget }) => {
        const current = latestAndroidSnapshot;
        if (!current) return;
        const deepLink = getDeepLink(current);
        const recommendedLabel = exerciseTitle(current.recommendedExerciseId);
        renderWidget(
          <widget.FlexWidget
            style={{
              height: 'match_parent',
              width: 'match_parent',
              backgroundColor: '#FFF9ED',
              padding: 14,
              justifyContent: 'center',
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: deepLink }}
          >
            <widget.TextWidget
              text="Biohead"
              style={{ color: '#0e2025', fontSize: 18, fontWeight: '700' }}
            />
            <widget.TextWidget
              text={recommendedLabel ? `Anbefalt: ${recommendedLabel}` : 'Åpne appen'}
              style={{ color: '#2f6f61', marginTop: 6, fontSize: 14 }}
            />
          </widget.FlexWidget>
        );
      });
      androidRegistered = true;
    }

    const deepLink = getDeepLink(snapshot);
    const recommendedLabel = exerciseTitle(snapshot.recommendedExerciseId);

    void widget.requestWidgetUpdate({
      widgetName: 'BioheadQuickWidget',
      renderWidget: async () => (
        <widget.FlexWidget
          style={{
            height: 'match_parent',
            width: 'match_parent',
            backgroundColor: '#FFF9ED',
            padding: 14,
            justifyContent: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: deepLink }}
        >
          <widget.TextWidget text="Biohead" style={{ color: '#0e2025', fontSize: 18, fontWeight: '700' }} />
          <widget.TextWidget
            text={recommendedLabel ? `Anbefalt: ${recommendedLabel}` : 'Pusteøvelse nå'}
            style={{ color: '#2f6f61', marginTop: 6, fontSize: 14 }}
          />
        </widget.FlexWidget>
      ),
    });
  } catch {
    // Ignore on unsupported builds (e.g. Expo Go).
  }
}

export function syncWidgetSnapshot(snapshot: WidgetSnapshot): void {
  if (isExpoGo) return;
  // iOS home-screen widget is deferred until the app moves to Expo SDK 55
  // (expo-widgets has no SDK 54 release). Android widget below is unaffected.
  setupAndroidWidget(snapshot);
}
