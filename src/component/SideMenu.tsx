import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {IconHome} from '../assets/icon/Home';
import {IconSetting} from '../assets/icon/Setting';
import {IconStar} from '../assets/icon/Star';
import type {ThemeColors} from '../tools/theme';

const avatar = require('../assets/img/icon.png');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SideMenuProps = {
  open: boolean;
  colors: ThemeColors;
  onClose: () => void;
  onHome: () => void;
  onFavorites: () => void;
  onSettings: () => void;
};

export const SideMenu = ({
  open,
  colors,
  onClose,
  onHome,
  onFavorites,
  onSettings,
}: SideMenuProps) => {
  const {width} = useWindowDimensions();
  const menuWidth = Math.min(width * 0.78, 320);
  const translateX = useRef(new Animated.Value(-menuWidth)).current;
  const maskOpacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(open);

  useEffect(() => {
    let animationFrame: number | null = null;

    if (open) {
      setShouldRender(true);
      animationFrame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(maskOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(maskOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -menuWidth,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({finished}) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }

    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [open, menuWidth, translateX, maskOpacity]);

  if (!shouldRender) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="关闭菜单"
        onPress={onClose}
        style={[
          styles.mask,
          {
            backgroundColor: colors.overlay,
            opacity: maskOpacity,
          },
        ]}
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
            <Text style={[styles.nickname, {color: colors.text}]}>Welcome</Text>
            <Text style={[styles.siteName, {color: colors.textMuted}]}>
              HerpyImageViewer
            </Text>
          </View>
        </View>

        <MenuItem
          label="首页"
          Icon={IconHome}
          colors={colors}
          onPress={() => {
            onHome();
            onClose();
          }}
        />
        <MenuItem
          label="收藏"
          Icon={IconStar}
          colors={colors}
          onPress={() => {
            onFavorites();
            onClose();
          }}
        />
        <MenuItem
          label="设置"
          Icon={IconSetting}
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
  Icon: React.ComponentType<{size?: number; color?: string}>;
  colors: ThemeColors;
  onPress: () => void;
};

const MenuItem = ({label, Icon, colors, onPress}: MenuItemProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({pressed}) => [
      styles.menuItem,
      {backgroundColor: pressed ? colors.primarySoft : colors.surface},
    ]}>
    <View style={styles.menuIcon}>
      <Icon size={25} color={colors.primary} />
    </View>
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
    borderRadius: 4,
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
  menuIcon: {
    width: 34,
    alignItems: 'flex-start',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
