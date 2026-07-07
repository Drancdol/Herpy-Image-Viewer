import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {apiSearch} from '../apis/apiHerpy';
import {AppHeader} from '../component/AppHeader';
import {useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';
import type {GalleryImage, SearchConfig} from '../tools/types';
import {GalleryPage} from './GalleryPage';

type SearchResultPageProps = {
  colors: ThemeColors;
  config: SearchConfig;
  onBack: () => void;
  onOpenImage: (item: GalleryImage) => void;
};

export const SearchResultPage = ({
  colors,
  config,
  onBack,
  onOpenImage,
}: SearchResultPageProps) => {
  const site = useAppSelector(state => state.app.site);
  const loadHtml = useCallback(
    async (page: number) => {
      const response = await apiSearch(
        config.inputData,
        {...config, page},
        site,
      );
      if (response.statusCode !== 200) {
        throw new Error(`search request failed: ${response.statusCode}`);
      }
      return response.data;
    },
    [config, site],
  );

  return (
    <View style={[styles.page, {backgroundColor: colors.background}]}>
      <AppHeader title="搜索结果" colors={colors} onBack={onBack} />
      <GalleryPage
        colors={colors}
        requestKey={JSON.stringify(config)}
        loadHtml={loadHtml}
        onOpenImage={onOpenImage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
});
