import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type {ThemeColors} from '../tools/theme';
import { IconMenu } from '../assets/icon/Menu.tsx';

type AppHeaderProps = {
  title?: string;
  searchPlaceholder?: string;
  colors: ThemeColors;
  onBack?: () => void;
  onMenu?: () => void;
  onSearch?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const AppHeader = ({
  title = 'HiaViewer',
  searchPlaceholder,
  colors,
  onBack,
  onMenu,
  onSearch,
  right,
  style,
}: AppHeaderProps) => (
  <View style={[styles.wrap, { backgroundColor: colors.surface }, style]}>
    {onBack ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="返回"
        onPress={onBack}
        style={styles.iconButton}
      >
        <Text style={[styles.iconText, { color: colors.text }]}>く</Text>
      </Pressable>
    ) : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="打开菜单"
        onPress={onMenu}
        style={styles.iconButton}
      >
        <IconMenu size={28} color={colors.text} />
      </Pressable>
    )}

    {searchPlaceholder ? (
      <Pressable
        accessibilityRole="button"
        onPress={onSearch}
        style={[
          styles.searchBox,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.searchText, { color: colors.textMuted }]}
        >
          {searchPlaceholder}
        </Text>
      </Pressable>
    ) : (
      <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
        {title}
      </Text>
    )}

    <View style={styles.rightBox}>{right}</View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    minHeight: 58,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.24)',
  },
  iconButton: {
    width: 40,
    height: 42,
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  iconText: {
    fontSize: 18,
    height: 32,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  searchBox: {
    flex: 1,
    height: 40,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchText: {
    fontSize: 15,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  rightBox: {
    width: 42,
    minHeight: 42,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
