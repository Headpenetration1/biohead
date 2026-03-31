import { initSentry } from '@/utils/initSentry';
import * as Sentry from '@sentry/react-native';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Comfortaa_400Regular,
  Comfortaa_500Medium,
  Comfortaa_600SemiBold,
  Comfortaa_700Bold,
} from '@expo-google-fonts/comfortaa';
import { AppProvider } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import ErrorBoundary from '@/components/ErrorBoundary';

initSentry();

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Comfortaa_400Regular,
    Comfortaa_500Medium,
    Comfortaa_600SemiBold,
    Comfortaa_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.darkBase },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="history" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="exercise/[id]"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="exercise/session"
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
        </Stack>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
