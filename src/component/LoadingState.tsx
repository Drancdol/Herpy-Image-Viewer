import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import type {ThemeColors} from '../tools/theme';

export const LoadingState = ({
  text = '加载中',
  colors,
}: {
  text?: string;
  colors: ThemeColors;
}) => (
  <View style={styles.wrap}>
    <ActivityIndicator color={colors.primary} size="large" />
    <Text style={[styles.text, {color: colors.textMuted}]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
  },
});
