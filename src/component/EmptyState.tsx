import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {ThemeColors} from '../tools/theme';

export const EmptyState = ({
  title,
  actionText,
  colors,
  onAction,
}: {
  title: string;
  actionText?: string;
  colors: ThemeColors;
  onAction?: () => void;
}) => (
  <View style={styles.wrap}>
    <Text style={[styles.title, {color: colors.textMuted}]}>{title}</Text>
    {actionText && onAction ? (
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        style={[styles.button, {backgroundColor: colors.primary}]}>
        <Text style={styles.buttonText}>{actionText}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    marginTop: 18,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
