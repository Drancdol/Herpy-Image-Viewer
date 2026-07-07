import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type {ThemeColors} from '../tools/theme';

const avatar = require('../assets/img/default_avatar.png');

type SideMenuProps = {
  open: boolean;
  colors: ThemeColors;
  onClose: () => void;
  onHome: () => void;
  onSettings: () => void;
};

export const SideMenu = ({
  open,
  colors,
  onClose,
  onHome,
  onSettings,
}: SideMenuProps) => {
  const {width} = useWindowDimensions();
  const menuWidth = Math.min(width * 0.78, 320);
  const translateX = useRef(new Animated.Value(-menuWidth)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: open ? 0 : -menuWidth,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [menuWidth, open, translateX]);

  if (!open) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="关闭菜单"
        onPress={onClose}
        style={[styles.mask, {backgroundColor: colors.overlay}]}
      />
      <Animated.View
        style={[
          styles.menu,
          {
            width: menuWidth,
            backgroundColor: colors.surface,
            transform: [{translateX}],
          },
        ]}>
        <View style={[styles.profile, {backgroundColor: colors.primarySoft}]}>
          <Image source={avatar} style={styles.avatar} />
          <View style={styles.profileText}>
            <Text style={[styles.nickname, {color: colors.text}]}>游客</Text>
            <Text style={[styles.siteName, {color: colors.textMuted}]}>
              Herpy Image Archive
            </Text>
          </View>
        </View>

        <MenuItem
          label="首页"
          symbol="⌂"
          colors={colors}
          onPress={() => {
            onHome();
            onClose();
          }}
        />
        <MenuItem
          label="设置"
          symbol="⚙"
          colors={colors}
          onPress={() => {
            onSettings();
            onClose();
          }}
        />
      </Animated.View>
    </View>
  );
};

type MenuItemProps = {
  label: string;
  symbol: string;
  colors: ThemeColors;
  onPress: () => void;
};

const MenuItem = ({label, symbol, colors, onPress}: MenuItemProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({pressed}) => [
      styles.menuItem,
      {backgroundColor: pressed ? colors.primarySoft : colors.surface},
    ]}>
    <Text style={[styles.menuSymbol, {color: colors.primary}]}>{symbol}</Text>
    <Text style={[styles.menuLabel, {color: colors.text}]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  mask: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  menu: {
    height: '100%',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: {width: 2, height: 0},
    shadowRadius: 12,
  },
  profile: {
    height: 148,
    paddingTop: 34,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  profileText: {
    flex: 1,
    marginLeft: 14,
  },
  nickname: {
    fontSize: 18,
    fontWeight: '700',
  },
  siteName: {
    marginTop: 4,
    fontSize: 12,
  },
  menuItem: {
    height: 58,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuSymbol: {
    width: 34,
    fontSize: 22,
    fontWeight: '700',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
