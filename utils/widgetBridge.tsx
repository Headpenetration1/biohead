import React from 'react';
import { Platform } from 'react-native';
import type { WidgetSnapshot } from '@/utils/storage';

let iosWidget: { updateSnapshot: (props: WidgetSnapshot) => void } | null = null;
let androidRegistered = false;

function getDeepLink(snapshot: WidgetSnapshot): string {
  const exerciseId = snapshot.recommendedExerciseId ?? snapshot.lastSessionExerciseId;
  if (exerciseId) return `biohead://exercise/${exerciseId}`;
  return 'biohead://';
}

function setupIosWidget(): void {
  if (Platform.OS !== 'ios') return;
  if (iosWidget) return;
  try {
    // Dynamic require keeps Android/web from evaluating iOS-only widget code paths.
    const widgets = require('expo-widgets') as typeof import('expo-widgets');
    const swiftUI = require('@expo/ui/swift-ui') as typeof import('@expo/ui/swift-ui');
    iosWidget = widgets.createWidget<WidgetSnapshot>('BioheadHomeWidget', (props) => {
      'widget';
      const primary = props.recommendedExerciseId ?? 'Åpne Biohead';
      const secondary = props.lastSessionExerciseId
        ? `Sist brukt: ${props.lastSessionExerciseId}`
        : 'Pusteøvelse nå';
      return (
        <swiftUI.VStack spacing={6}>
          <swiftUI.Text>Biohead</swiftUI.Text>
          <swiftUI.Text>{primary}</swiftUI.Text>
          <swiftUI.Text>{secondary}</swiftUI.Text>
        </swiftUI.VStack>
      );
    });
  } catch {
    iosWidget = null;
  }
}

function setupAndroidWidget(snapshot: WidgetSnapshot): void {
  if (Platform.OS !== 'android') return;
  try {
    const widget = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const deepLink = getDeepLink(snapshot);
    if (!androidRegistered) {
      widget.registerWidgetTaskHandler(async ({ renderWidget }) => {
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
              text={snapshot.recommendedExerciseId ? `Anbefalt: ${snapshot.recommendedExerciseId}` : 'Åpne appen'}
              style={{ color: '#46917c', marginTop: 6, fontSize: 14 }}
            />
          </widget.FlexWidget>
        );
      });
      androidRegistered = true;
    }

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
            text={snapshot.recommendedExerciseId ? `Anbefalt: ${snapshot.recommendedExerciseId}` : 'Pusteøvelse nå'}
            style={{ color: '#46917c', marginTop: 6, fontSize: 14 }}
          />
        </widget.FlexWidget>
      ),
    });
  } catch {
    // Ignore on unsupported builds (e.g. Expo Go).
  }
}

export function syncWidgetSnapshot(snapshot: WidgetSnapshot): void {
  setupIosWidget();
  if (iosWidget) {
    try {
      iosWidget.updateSnapshot(snapshot);
    } catch {
      // ignore
    }
  }
  setupAndroidWidget(snapshot);
}
