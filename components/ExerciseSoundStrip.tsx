import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bell, Leaf, Music, VolumeX } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import type { SoundMode } from '@/utils/storage';
import {
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
  /** Brukes i øktmodus, der pustesirkelen må eie skjermens midtpunkt. */
  compact?: boolean;
}

const SOUND_MODE_ICON = {
  off: VolumeX,
  ambient: Leaf,
  cues: Bell,
  mix: Music,
} satisfies Record<
  SoundMode,
  React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
>;

export function ExerciseSoundStrip({
  soundMode,
  toneEnabled,
  toneFrequency,
  onCycleSoundMode,
  onToggleTone,
  onOpenMixer,
  kickerText,
  compact = false,
}: ExerciseSoundStripProps) {
  const soundCycleA11yLabel = useMemo(
    () => buildSoundCycleAccessibilityLabel(soundMode, toneEnabled, toneFrequency),
    [soundMode, toneEnabled, toneFrequency]
  );
  const SoundModeIcon = SOUND_MODE_ICON[soundMode];

  return (
    <View
      style={[
        styles.soundStrip,
        compact && styles.soundStripCompact,
        soundMode !== 'off' && styles.soundStripActive,
      ]}
    >
      <Pressable
        onPress={onCycleSoundMode}
        style={[styles.soundStripMain, compact && styles.soundStripMainCompact]}
        accessibilityRole="button"
        accessibilityLabel={soundCycleA11yLabel}
        accessibilityHint="Bytter mellom av, naturlyd, signaler og miks"
      >
        <View
          style={[styles.soundStripIcon, compact && styles.soundStripIconCompact]}
          importantForAccessibility="no-hide-descendants"
        >
          <SoundModeIcon
            size={compact ? 17 : 23}
            color={soundMode === 'off' ? Colors.textMuted : Colors.textPrimary}
            strokeWidth={1.8}
          />
        </View>
        <View style={styles.soundStripTextBlock}>
          {!compact ? <Text style={styles.soundStripKicker}>{kickerText}</Text> : null}
          <Text style={[styles.soundStripTitle, compact && styles.soundStripTitleCompact]} numberOfLines={1}>
            {compact ? `Lyd: ${SOUND_MODE_TITLE[soundMode]}` : SOUND_MODE_TITLE[soundMode]}
          </Text>
          {toneEnabled && !compact ? (
            <Text style={styles.soundToneMeta} numberOfLines={1}>
              Droningtone ~{Math.round(toneFrequency)} Hz
            </Text>
          ) : null}
          {!compact ? <Text style={styles.soundStripHint}>Trykk her for neste modus</Text> : null}
        </View>
      </Pressable>
      <View style={[styles.soundStripActions, compact && styles.soundStripActionsCompact]}>
        <Pressable
          onPress={onToggleTone}
          style={[styles.soundSideBtn, compact && styles.soundSideBtnCompact, toneEnabled && styles.soundSideBtnOn]}
          accessibilityRole="button"
          accessibilityLabel={
            toneEnabled ? 'Slå av droningtone under økt' : 'Slå på droningtone under økt'
          }
          hitSlop={6}
        >
          <Text
            style={[
              styles.soundSideBtnText,
              compact && styles.soundSideBtnTextCompact,
              toneEnabled && styles.soundSideBtnTextOn,
            ]}
          >
            {compact ? 'Tone' : toneEnabled ? 'Tone på' : 'Tone av'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenMixer}
          style={[styles.soundSideBtn, compact && styles.soundSideBtnCompact]}
          accessibilityRole="button"
          accessibilityLabel="Åpne lydmikser"
          accessibilityHint="Juster volum, naturlyd-miks og tone"
          hitSlop={6}
        >
          <Text style={[styles.soundSideBtnText, compact && styles.soundSideBtnTextCompact]}>
            {compact ? 'Miks' : 'Juster'}
          </Text>
          {!compact ? <Text style={styles.soundSideBtnSub}>lyd</Text> : null}
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
  soundStripCompact: {
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    minHeight: 48,
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
  soundStripMainCompact: {
    gap: 8,
  },
  soundStripIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundStripIconCompact: {
    width: 22,
    height: 22,
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
  soundStripTitleCompact: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
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
  soundStripActionsCompact: {
    flexDirection: 'row',
    gap: 6,
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
  soundSideBtnCompact: {
    minWidth: 50,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
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
  soundSideBtnTextCompact: {
    fontSize: 10,
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
