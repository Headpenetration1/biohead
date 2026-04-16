import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import type { SoundMode } from '@/utils/storage';
import {
  SOUND_MODE_LABEL,
  SOUND_MODE_TITLE,
  buildSoundCycleAccessibilityLabel,
} from '@/constants/sessionSoundUi';

export interface ExerciseSoundStripProps {
  soundMode: SoundMode;
  toneEnabled: boolean;
  toneFrequency: number;
  onCycleSoundMode: () => void;
  onToggleTone: () => void;
  onOpenMixer: () => void;
  /** F.eks. «Lyd under økt» på øktskjerm, «Lyd før neste økt» på øvelsesside. */
  kickerText: string;
}

export function ExerciseSoundStrip({
  soundMode,
  toneEnabled,
  toneFrequency,
  onCycleSoundMode,
  onToggleTone,
  onOpenMixer,
  kickerText,
}: ExerciseSoundStripProps) {
  const soundCycleA11yLabel = useMemo(
    () => buildSoundCycleAccessibilityLabel(soundMode, toneEnabled, toneFrequency),
    [soundMode, toneEnabled, toneFrequency]
  );

  return (
    <View style={[styles.soundStrip, soundMode !== 'off' && styles.soundStripActive]}>
      <Pressable
        onPress={onCycleSoundMode}
        style={styles.soundStripMain}
        accessibilityRole="button"
        accessibilityLabel={soundCycleA11yLabel}
        accessibilityHint="Bytter mellom av, naturlyd, signaler og miks"
      >
        <Text style={styles.soundStripEmoji} accessibilityElementsHidden>
          {SOUND_MODE_LABEL[soundMode]}
        </Text>
        <View style={styles.soundStripTextBlock}>
          <Text style={styles.soundStripKicker}>{kickerText}</Text>
          <Text style={styles.soundStripTitle} numberOfLines={2}>
            {SOUND_MODE_TITLE[soundMode]}
          </Text>
          {toneEnabled ? (
            <Text style={styles.soundToneMeta} numberOfLines={1}>
              Droningtone ~{Math.round(toneFrequency)} Hz
            </Text>
          ) : null}
          <Text style={styles.soundStripHint}>Trykk her for neste modus</Text>
        </View>
      </Pressable>
      <View style={styles.soundStripActions}>
        <Pressable
          onPress={onToggleTone}
          style={[styles.soundSideBtn, toneEnabled && styles.soundSideBtnOn]}
          accessibilityRole="button"
          accessibilityLabel={
            toneEnabled ? 'Slå av droningtone under økt' : 'Slå på droningtone under økt'
          }
          hitSlop={6}
        >
          <Text style={[styles.soundSideBtnText, toneEnabled && styles.soundSideBtnTextOn]}>
            {toneEnabled ? 'Tone på' : 'Tone av'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenMixer}
          style={styles.soundSideBtn}
          accessibilityRole="button"
          accessibilityLabel="Åpne lydmikser"
          accessibilityHint="Juster volum, naturlyd-miks og tone"
          hitSlop={6}
        >
          <Text style={styles.soundSideBtnText}>Juster</Text>
          <Text style={styles.soundSideBtnSub}>lyd</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  soundStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(14,32,37,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.08)',
    width: '100%',
  },
  soundStripActive: {
    borderColor: `${Colors.greenAccent}44`,
    backgroundColor: `${Colors.greenAccent}10`,
  },
  soundStripMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  soundStripEmoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  soundStripTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  soundStripKicker: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  soundStripTitle: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
  soundToneMeta: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.xs,
    color: Colors.greenAccent,
  },
  soundStripHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  soundStripActions: {
    justifyContent: 'center',
    gap: 8,
    alignItems: 'stretch',
  },
  soundSideBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(14,32,37,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.1)',
    minWidth: 72,
  },
  soundSideBtnOn: {
    borderColor: `${Colors.greenAccent}55`,
    backgroundColor: `${Colors.greenAccent}18`,
  },
  soundSideBtnText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.sizes.xs,
    color: Colors.textPrimary,
  },
  soundSideBtnTextOn: {
    color: Colors.greenAccent,
  },
  soundSideBtnSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
