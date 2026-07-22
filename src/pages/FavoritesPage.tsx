import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {apiFavoriteGalleryPage} from '../apis/gallery';
import {AppHeader} from '../component/AppHeader';
import {useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';
import type {GalleryImage} from '../tools/types';
import {GalleryPage} from './GalleryPage';

type FavoritesPageProps = {
  colors: ThemeColors;
  onBack: () => void;
  onOpenImage: (item: GalleryImage) => void;
};

export const FavoritesPage = ({
  colors,
  onBack,
  onOpenImage,
}: FavoritesPageProps) => {
  const site = useAppSelector(state => state.app.site);
  const loadHtml = useCallback(
    async (page: number, signal?: AbortSignal) => {
      const response = await apiFavoriteGalleryPage(page, site, {signal});
      if (response.statusCode !== 200) {
        throw new Error(`favorites request failed: ${response.statusCode}`);
      }
      return response.data;
    },
    [site],
  );

  return (
    <View style={[styles.page, {backgroundColor: colors.background}]}>
      <AppHeader title="收藏" colors={colors} onBack={onBack} />
      <GalleryPage
        colors={colors}
        requestKey="favorites"
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
