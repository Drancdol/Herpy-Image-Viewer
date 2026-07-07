import React, {useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {AppHeader} from '../component/AppHeader';
import {appActions, createSearchConfig} from '../store';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';
import type {SearchConfig} from '../tools/types';

type SearchPageProps = {
  colors: ThemeColors;
  onBack: () => void;
  onSearch: (config: SearchConfig) => void;
};

const SEARCH_FIELDS: Array<{key: keyof SearchConfig; label: string}> = [
  {key: 'keywords', label: '搜索关键词'},
  {key: 'title', label: '搜索缩略图标题'},
  {key: 'filename', label: '搜索文件名'},
  {key: 'owner_name', label: '搜索作者名'},
];

export const SearchPage = ({colors, onBack, onSearch}: SearchPageProps) => {
  const dispatch = useAppDispatch();
  const searchHistory = useAppSelector(state => state.app.searchHistory);
  const [inputText, setInputText] = useState('');
  const [config, setConfig] = useState<SearchConfig>(() => createSearchConfig());
  const keywords = useMemo(
    () => inputText.split(/\s+/).map(item => item.trim()).filter(Boolean),
    [inputText],
  );

  const updateConfig = (patch: Partial<SearchConfig>) => {
    setConfig(current => ({...current, ...patch}));
  };

  const submit = () => {
    const nextConfig = {...config, inputData: keywords};
    const historyText = keywords.join(' ');

    dispatch(appActions.addSearchHistory(historyText));
    onSearch(nextConfig);
  };

  return (
    <View style={[styles.page, {backgroundColor: colors.background}]}>
      <AppHeader title="搜索" colors={colors} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.inputBox, {backgroundColor: colors.surface}]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="单关键词多单词用_连接，多个关键词用空格隔开"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          />
        </View>

        {searchHistory.length > 0 ? (
          <View style={styles.history}>
            {searchHistory.map(item => (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => setInputText(current => `${current} ${item}`.trim())}
                style={[styles.historyChip, {backgroundColor: colors.chip}]}>
                <Text style={[styles.historyText, {color: colors.primary}]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <SectionLabel text="搜索源" colors={colors} />
        {SEARCH_FIELDS.map(field => (
          <CheckRow
            key={field.key}
            label={field.label}
            checked={Boolean(config[field.key])}
            colors={colors}
            onPress={() =>
              updateConfig({[field.key]: !config[field.key]} as Partial<SearchConfig>)
            }
          />
        ))}

        <SectionLabel text="匹配模式" colors={colors} />
        <View style={[styles.segment, {backgroundColor: colors.surface}]}>
          {(['AND', 'OR'] as const).map(type => (
            <SegmentButton
              key={type}
              type={type}
              active={config.type === type}
              colors={colors}
              onPress={() => updateConfig({type})}
            />
          ))}
        </View>

        <SearchButton
          disabled={keywords.length === 0}
          colors={colors}
          onPress={submit}
        />
      </ScrollView>
    </View>
  );
};

const SectionLabel = ({text, colors}: {text: string; colors: ThemeColors}) => (
  <Text style={[styles.sectionLabel, {color: colors.textMuted}]}>{text}</Text>
);

const CheckRow = ({
  label,
  checked,
  colors,
  onPress,
}: {
  label: string;
  checked: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) => {
  const rowColor = {backgroundColor: colors.surface};
  const boxColor = {
    borderColor: checked ? colors.primary : colors.border,
    backgroundColor: checked ? colors.primary : 'transparent',
  };
  const labelColor = {color: colors.text};

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{checked}}
      onPress={onPress}
      style={[styles.checkRow, rowColor]}>
      <View style={[styles.checkBox, boxColor]}>
        <Text style={styles.checkMark}>{checked ? '✓' : ''}</Text>
      </View>
      <Text style={[styles.checkLabel, labelColor]}>{label}</Text>
    </Pressable>
  );
};

const SegmentButton = ({
  type,
  active,
  colors,
  onPress,
}: {
  type: 'AND' | 'OR';
  active: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) => {
  const buttonColor = {backgroundColor: active ? colors.primary : colors.surface};
  const textColor = {color: active ? '#fff' : colors.text};

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.segmentItem, buttonColor]}>
      <Text style={[styles.segmentText, textColor]}>
        {type === 'AND' ? '同时匹配' : '任一匹配'}
      </Text>
    </Pressable>
  );
};

const SearchButton = ({
  disabled,
  colors,
  onPress,
}: {
  disabled: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) => {
  const buttonColor = {
    backgroundColor: disabled ? colors.surfaceStrong : colors.primary,
  };
  const textColor = {color: disabled ? colors.textMuted : '#fff'};

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.searchButton, buttonColor]}>
      <Text style={[styles.searchButtonText, textColor]}>搜索</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  inputBox: {
    padding: 12,
  },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  history: {
    paddingHorizontal: 12,
    paddingTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    marginTop: 18,
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  checkRow: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  checkLabel: {
    marginLeft: 12,
    fontSize: 15,
  },
  segment: {
    marginHorizontal: 12,
    borderRadius: 6,
    padding: 4,
    flexDirection: 'row',
  },
  segmentItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchButton: {
    marginTop: 32,
    marginHorizontal: 28,
    height: 46,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
