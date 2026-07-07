import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {pageButtons} from '../tools/process';
import type {ThemeColors} from '../tools/theme';

type PaginationProps = {
  current: number;
  pages: number;
  total: number;
  colors: ThemeColors;
  onChange: (page: number) => void;
};

export const Pagination = ({
  current,
  pages,
  total,
  colors,
  onChange,
}: PaginationProps) => {
  const buttons = useMemo(() => pageButtons(current, pages), [current, pages]);

  return (
    <View style={[styles.wrap, {backgroundColor: colors.surface}]}>
      <View style={styles.pageRow}>
        {buttons.map((button, index) => {
          const active = button === current;
          return (
            <Pressable
              key={`${button}-${index}`}
              accessibilityRole="button"
              onPress={() => {
                if (button === '...') {
                  const before = Number(buttons[index - 1]);
                  const after = Number(buttons[index + 1]);
                  if (Number.isFinite(before) && Number.isFinite(after)) {
                    onChange(Math.floor((before + after) / 2));
                  }
                  return;
                }
                onChange(button);
              }}
              style={styles.pageButton}>
              <Text
                style={[
                  styles.pageText,
                  {color: active ? colors.primary : colors.textMuted},
                ]}>
                {button}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.infoRow}>
        <PagerButton
          label="上一页"
          disabled={current <= 1}
          colors={colors}
          onPress={() => onChange(current - 1)}
        />
        <Text style={[styles.totalText, {color: colors.textMuted}]}>
          {total ? `总数：${total}` : `${current}/${pages || 1}`}
        </Text>
        <PagerButton
          label="下一页"
          disabled={current >= pages}
          colors={colors}
          onPress={() => onChange(current + 1)}
        />
      </View>
    </View>
  );
};

type PagerButtonProps = {
  label: string;
  disabled: boolean;
  colors: ThemeColors;
  onPress: () => void;
};

const PagerButton = ({label, disabled, colors, onPress}: PagerButtonProps) => (
  (() => {
    const buttonColor = {
      backgroundColor: disabled ? colors.surfaceStrong : colors.primary,
    };
    const textColor = {color: disabled ? colors.textMuted : '#fff'};

    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[styles.navButton, buttonColor]}>
        <Text style={[styles.navButtonText, textColor]}>{label}</Text>
      </Pressable>
    );
  })()
);

const styles = StyleSheet.create({
  wrap: {
    minHeight: 104,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.24)',
  },
  pageRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  pageButton: {
    minWidth: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    height: 48,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
  },
  navButton: {
    width: 92,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
