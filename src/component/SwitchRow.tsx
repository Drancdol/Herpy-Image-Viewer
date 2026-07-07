import React from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import type {ThemeColors} from '../tools/theme';

type SwitchRowProps = {
  title: string;
  description?: string;
  value: boolean;
  colors: ThemeColors;
  onValueChange: (value: boolean) => void;
};

export const SwitchRow = ({
  title,
  description,
  value,
  colors,
  onValueChange,
}: SwitchRowProps) => (
  <Pressable
    accessibilityRole="switch"
    accessibilityState={{checked: value}}
    onPress={() => onValueChange(!value)}
    style={[styles.row, {backgroundColor: colors.surface, borderColor: colors.border}]}>
    <View style={styles.textBox}>
      <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, {color: colors.textMuted}]}>
          {description}
        </Text>
      ) : null}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{false: colors.surfaceStrong, true: colors.primarySoft}}
      thumbColor={value ? colors.primary : '#f7f7f7'}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBox: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
});
