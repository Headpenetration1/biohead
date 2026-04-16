import { Audio } from 'expo-av';

// We only need to call `setAudioModeAsync` once per app launch – after that the
// settings stick. This module-level guard deduplicates calls from the sound
// mixer screen and the session hook (which used to maintain separate flags
// that could drift apart).
let audioModeReady = false;

export async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}
