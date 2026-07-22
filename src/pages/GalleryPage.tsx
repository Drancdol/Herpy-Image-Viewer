import React, {useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {StyleSheet, Text, View} from 'react-native';
import {AlbumGrid} from '../component/AlbumGrid';
import {EmptyState} from '../component/EmptyState';
import {LoadingState} from '../component/LoadingState';
import {Pagination} from '../component/Pagination';
import {appActions} from '../store';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {galleryQueryKey} from '../query/keys';
import type {ThemeColors} from '../tools/theme';
import type {GalleryImage, PaginationInfo} from '../tools/types';
import {parseGalleryImages, parsePagination} from '../tools/process';

type GalleryPageProps = {
  colors: ThemeColors;
  title?: string;
  requestKey: string;
  loadHtml: (page: number, signal?: AbortSignal) => Promise<string>;
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
  const site = useAppSelector(state => state.app.site);
  const settings = useAppSelector(state => state.app.settings);
  const [page, setPage] = useState(1);
  const defaultPagination: PaginationInfo = {
    currentIndex: 1,
    totalPages: 1,
    totalNumber: 0,
  };
  const {data, isError, isPending, refetch} = useQuery({
    queryKey: galleryQueryKey(site.baseUrl, requestKey, page),
    queryFn: async ({signal}) => {
      const html = await loadHtml(page, signal);
      const nextPagination = parsePagination(html, page);

      return {
        images: parseGalleryImages(html),
        pagination: {
          currentIndex: page,
          totalPages: Math.max(nextPagination.totalPages, 1),
          totalNumber: nextPagination.totalNumber,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  useEffect(() => {
    setPage(1);
  }, [requestKey]);

  useEffect(() => {
    if (data) {
      dispatch(appActions.setUpNextCache(data.images));
    }
  }, [data, dispatch]);

  const images = data?.images ?? [];
  const pagination = data?.pagination ?? defaultPagination;

  if (isPending) {
    return <LoadingState colors={colors} text="正在加载图集" />;
  }

  if (isError && !data) {
    return (
      <EmptyState
        title="网络超时，加载失败"
        actionText="重试"
        colors={colors}
        onAction={() => refetch()}
      />
    );
  }

  if (images.length === 0) {
    return (
      <EmptyState
        title="暂无图片"
        actionText="刷新"
        colors={colors}
        onAction={() => {
          if (page === 1) {
            refetch();
          } else {
            setPage(1);
          }
        }}
      />
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
        onChange={nextPage => {
          if (nextPage !== pagination.currentIndex) {
            setPage(nextPage);
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
