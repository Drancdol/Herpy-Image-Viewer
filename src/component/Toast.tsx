import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import type {ThemeColors} from '../tools/theme';

type ToastType = 'success' | 'error' | 'info';

type ToastOptions = {
  type?: ToastType;
  duration?: number;
};

type ToastPayload = {
  message: string;
  type: ToastType;
  duration: number;
};

type ToastHandler = (payload: ToastPayload) => void;

const DEFAULT_DURATION = 3000;
let toastHandler: ToastHandler | null = null;

export const toast = {
  show(message: string, options: ToastOptions = {}) {
    const normalized = message.trim();
    if (!normalized) {
      return;
    }

    toastHandler?.({
      message: normalized,
      type: options.type ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION,
    });
  },
  success(message: string, duration?: number) {
    toast.show(message, {type: 'success', duration});
  },
  error(message: string, duration?: number) {
    toast.show(message, {type: 'error', duration});
  },
  info(message: string, duration?: number) {
    toast.show(message, {type: 'info', duration});
  },
};

type ToastHostProps = {
  colors: ThemeColors;
};

export const ToastHost = ({colors}: ToastHostProps) => {
  const [current, setCurrent] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceRef = useRef(0);

  useEffect(() => {
    const show: ToastHandler = payload => {
      sequenceRef.current += 1;
      const sequence = sequenceRef.current;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      opacity.stopAnimation();
      translateY.stopAnimation();
      opacity.setValue(0);
      translateY.setValue(-10);
      setCurrent(payload);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        timerRef.current = setTimeout(() => {
          if (sequenceRef.current !== sequence) {
            return;
          }

          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0,
              duration: 180,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: -8,
              duration: 180,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(({finished}) => {
            if (finished && sequenceRef.current === sequence) {
              setCurrent(null);
            }
          });
        }, payload.duration);
      });
    };

    toastHandler = show;

    return () => {
      if (toastHandler === show) {
        toastHandler = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [opacity, translateY]);

  if (!current) {
    return null;
  }

  const accentColor =
    current.type === 'success'
      ? colors.primary
      : current.type === 'error'
        ? colors.danger
        : colors.accent;
  const toastColors = {
    backgroundColor: colors.name === 'dark' ? '#edf3f8' : '#1f2933',
  };
  const messageColors = {
    color: colors.name === 'dark' ? '#101820' : '#ffffff',
  };

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity,
            transform: [{translateY}],
          },
          toastColors,
        ]}>
        <View style={[styles.accent, {backgroundColor: accentColor}]} />
        <Text
          numberOfLines={3}
          style={[styles.message, messageColors]}>
          {current.message}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    zIndex: 10000,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  toast: {
    minHeight: 44,
    maxWidth: 420,
    width: '100%',
    borderRadius: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  message: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
