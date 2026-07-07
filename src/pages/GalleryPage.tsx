import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {AlbumGrid} from '../component/AlbumGrid';
import {EmptyState} from '../component/EmptyState';
import {LoadingState} from '../component/LoadingState';
import {Pagination} from '../component/Pagination';
import {appActions} from '../store';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';
import type {GalleryImage, PaginationInfo} from '../tools/types';
import {parseGalleryImages, parsePagination} from '../tools/process';

type GalleryPageProps = {
  colors: ThemeColors;
  title?: string;
  requestKey: string;
  loadHtml: (page: number) => Promise<string>;
  onOpenImage: (item: GalleryImage) => void;
  onBackToMain?: () => void;
};

export const GalleryPage = ({
  colors,
  title,
  requestKey,
  loadHtml,
  onOpenImage,
  onBackToMain,
}: GalleryPageProps) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.app.settings);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFail, setLoadFail] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentIndex: 1,
    totalPages: 1,
    totalNumber: 0,
  });

  const loadPage = useCallback(
    async (page: number) => {
      setLoading(true);
      setLoadFail(false);
      try {
        const html = await loadHtml(page);
        const nextImages = parseGalleryImages(html);
        const nextPagination = parsePagination(html, page);

        setImages(nextImages);
        dispatch(appActions.setUpNextCache(nextImages));
        setPagination({
          currentIndex: page,
          totalPages: Math.max(nextPagination.totalPages, 1),
          totalNumber: nextPagination.totalNumber,
        });
      } catch {
        setLoadFail(true);
      } finally {
        setLoading(false);
      }
    },
    [dispatch, loadHtml],
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage, requestKey]);

  if (loading) {
    return <LoadingState colors={colors} text="正在加载图集" />;
  }

  if (loadFail) {
    return (
      <EmptyState
        title="网络超时，加载失败"
        actionText="重试"
        colors={colors}
        onAction={() => loadPage(pagination.currentIndex)}
      />
    );
  }

  if (images.length === 0) {
    return (
      <EmptyState title="暂无图片" actionText="刷新" colors={colors} onAction={() => loadPage(1)} />
    );
  }

  return (
    <View style={styles.wrap}>
      {title || onBackToMain ? (
        <View style={[styles.subHeader, {backgroundColor: colors.background}]}>
          {onBackToMain ? (
            <Text
              accessibilityRole="button"
              onPress={onBackToMain}
              style={[styles.backText, {color: colors.primary}]}>
              ‹ 分类
            </Text>
          ) : null}
          {title ? (
            <Text numberOfLines={1} style={[styles.title, {color: colors.text}]}>
              {title}
            </Text>
          ) : null}
        </View>
      ) : null}
      <AlbumGrid
        list={images}
        comicMode={settings.comicMode}
        colors={colors}
        onOpen={onOpenImage}
      />
      <Pagination
        current={pagination.currentIndex}
        pages={pagination.totalPages}
        total={pagination.totalNumber}
        colors={colors}
        onChange={page => {
          if (page !== pagination.currentIndex) {
            loadPage(page);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  subHeader: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    minWidth: 56,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
});
