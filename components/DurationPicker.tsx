import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { DURATION_OPTIONS } from '@/constants/exercises';
import { useHaptics } from '@/hooks/useHaptics';
import { formatDurationAccessible, formatDurationShort } from '@/utils/formatTime';

interface DurationPickerProps {
  value: number;
  onChange: (duration: number) => void;
  glowColor: string;
  hapticsEnabled?: boolean;
}

export default function DurationPicker({
  value,
  onChange,
  glowColor,
  hapticsEnabled = true,
}: DurationPickerProps) {
  const { selection } = useHaptics(hapticsEnabled);

  return (
    <View style={styles.container}>
      {DURATION_OPTIONS.map((d) => {
        const active = value === d;
        return (
          <Pressable
            key={d}
            onPress={() => {
              selection();
              onChange(d);
            }}
            accessibilityRole="radio"
            accessibilityLabel={formatDurationAccessible(d)}
            accessibilityState={{ selected: active }}
            style={[
              styles.option,
              active && {
                backgroundColor: `${glowColor}22`,
              },
            ]}
          >
            <Text
              style={[
                styles.optionText,
                active && {
                  color: Colors.textPrimary,
                  fontFamily: Typography.fontFamily.semibold,
                },
              ]}
            >
              {formatDurationShort(d)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(14,32,37,0.03)',
    padding: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,32,37,0.06)',
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
});
