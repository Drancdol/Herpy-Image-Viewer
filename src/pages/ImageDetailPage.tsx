import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  Image,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {apiAddFav, parseFavoriteAction} from '../apis/fav';
import {AppHeader} from '../component/AppHeader';
import {EmptyState} from '../component/EmptyState';
import {LoadingState} from '../component/LoadingState';
import {ThumbnailImage} from '../component/ThumbnailImage';
import {toast} from '../component/Toast';
import {ZoomImageModal} from '../component/ZoomImageModal';
import {useAppSelector} from '../store/hooks';
import {fetchImageDetail, fetchRawImageSrc} from '../query/fetchers';
import {
  galleryQueryPrefix,
  imageDetailQueryKey,
  rawImageQueryKey,
} from '../query/keys';
import type {ThemeColors} from '../tools/theme';
import type {GalleryImage, ImageDetail, LinkValue} from '../tools/types';
import {
  absoluteImageUrl,
} from '../tools/process';

type ImageDetailPageProps = {
  colors: ThemeColors;
  image: GalleryImage;
  onBack: () => void;
};

export const ImageDetailPage = ({
  colors,
  image,
  onBack,
}: ImageDetailPageProps) => {
  const site = useAppSelector(state => state.app.site);
  const settings = useAppSelector(state => state.app.settings);
  const upNextCache = useAppSelector(state => state.app.upNextCache);
  const queryClient = useQueryClient();
  const {width} = useWindowDimensions();
  const [currentImage, setCurrentImage] = useState(image);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawSrc, setRawSrc] = useState('');
  const [displayRaw, setDisplayRaw] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [rawDownloading, setRawDownloading] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [message, setMessage] = useState('');
  const currentImageRef = useRef(image);
  const detailQuery = useQuery({
    queryKey: imageDetailQueryKey(site.baseUrl, currentImage.href),
    queryFn: ({ signal }) => fetchImageDetail(currentImage.href, site, signal),
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });
  const favoriteMutation = useMutation({
    mutationFn: (pid: number | string) => apiAddFav(pid, site),
  });
  const detail = detailQuery.data;
  const loading = detailQuery.isPending;
  const loadFailMsg =
    detailQuery.error instanceof Error ? detailQuery.error.message : '';
  const favLoading = favoriteMutation.isPending;

  useEffect(() => {
    currentImageRef.current = image;
    setCurrentImage(image);
  }, [image]);

  useEffect(() => {
    setDisplayRaw(false);
    setRawSrc('');
    setMessage('');
  }, [currentImage.href]);

  useEffect(() => {
    setIsFav(getFavoriteState(detail));
  }, [detail]);

  const resolveRawImage = useCallback(
    async (target: ImageDetail) => {
      if (target.fullSrc) {
        return target.fullSrc;
      }
      if (!target.fullHref) {
        return '';
      }

      const fullHref = target.fullHref;
      setRawLoading(true);
      try {
        return await queryClient.fetchQuery({
          queryKey: rawImageQueryKey(site.baseUrl, fullHref),
          queryFn: ({ signal }) => fetchRawImageSrc(fullHref, site, signal),
          staleTime: 60 * 1000,
          gcTime: 3 * 60 * 1000,
        });
      } finally {
        setRawLoading(false);
      }
    },
    [queryClient, site],
  );

  useEffect(() => {
    if (!detail || !settings.preLoadRawImg) {
      return;
    }

    let active = true;
    resolveRawImage(detail)
      .then(nextRawSrc => {
        if (active && nextRawSrc) {
          Image.prefetch(absoluteImageUrl(nextRawSrc, site));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [detail, resolveRawImage, settings.preLoadRawImg, site]);

  const currentIndex = useMemo(
    () => upNextCache.findIndex(item => item.href === currentImage.href),
    [currentImage.href, upNextCache],
  );

  const switchImage = useCallback(
    (direction: 'prev' | 'next') => {
      if (currentIndex < 0) {
        setMessage('没有上下张缓存');
        return;
      }

      const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0) {
        setMessage('当前已经是第一页第一张');
        return;
      }
      if (nextIndex >= upNextCache.length) {
        setMessage('当前已经是此页最后一张');
        return;
      }
      const nextImage = upNextCache[nextIndex];
      currentImageRef.current = nextImage;
      setCurrentImage(nextImage);
    },
    [currentIndex, upNextCache],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          settings.openSlideSwitch &&
          Math.abs(gesture.dx) > 20 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          if (
            !settings.openSlideSwitch ||
            Math.abs(gesture.dy) > 60 ||
            Math.abs(gesture.dx) < 100
          ) {
            return;
          }
          switchImage(gesture.dx > 0 ? 'prev' : 'next');
        },
      }),
    [settings.openSlideSwitch, switchImage],
  );

  const showRawImage = async () => {
    if (!detail) {
      return;
    }

    try {
      const nextRawSrc = await resolveRawImage(detail);
      if (!nextRawSrc) {
        setMessage('原图地址加载失败');
        return;
      }

      setRawSrc(nextRawSrc);
      setDisplayRaw(true);
    } catch {
      setMessage('原图地址加载失败');
    }
  };

  const addFavorite = async () => {
    const favoriteHref = currentImage.href;
    const pid = extractImagePid(favoriteHref);
    if (favLoading) {
      return;
    }
    if (!pid) {
      toast.error('图片 ID 获取失败');
      return;
    }
    try {
      const response = await favoriteMutation.mutateAsync(pid);
      if (response.statusCode !== 200) {
        throw new Error(`favorite request failed: ${response.statusCode}`);
      }

      const action = parseFavoriteAction(response.data);
      if (action === 'added') {
        //主要是去掉收藏列表页的缓存 invalid cache list in fav page
        await queryClient.invalidateQueries({
          queryKey: galleryQueryPrefix(site.baseUrl, 'favorites'),
        });
        toast.success('收藏成功');
        if (currentImageRef.current.href === favoriteHref) {
          setIsFav(true);
        }
      } else if (action === 'removed') {
        await queryClient.invalidateQueries({
          queryKey: galleryQueryPrefix(site.baseUrl, 'favorites'),
        });
        toast.info('已取消收藏');
        if (currentImageRef.current.href === favoriteHref) {
          setIsFav(false);
        }
      } else {
        toast.error('收藏操作失败，请稍后重试');
      }
    } catch {
      toast.error('收藏操作失败，请稍后重试');
    }
  };

  const metadata = detail ? buildMetadata(detail) : null;

  const downloadRawImage = async () => {
    if (!detail || rawDownloading) {
      return;
    }

    setRawDownloading(true);
    setMessage('');
    try {
      const hasPermission = await ensureDownloadPermission();
      if (!hasPermission) {
        setMessage('没有下载文件权限');
        return;
      }

      const nextRawSrc = await resolveRawImage(detail);
      if (!nextRawSrc) {
        setMessage('图片地址加载失败');
        return;
      }

      setRawSrc(nextRawSrc);

      const rawUri = absoluteImageUrl(nextRawSrc, site);
      const fileName = buildDownloadFileName(metadata?.filename, rawUri);
      const mime = getImageMimeType(fileName);

      if (Platform.OS === 'android') {
        await ReactNativeBlobUtil.config({
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            mediaScannable: true,
            storeInDownloads: true,
            title: fileName,
            description: 'Herpy Image',
            mime,
            path: `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`,
          },
        }).fetch('GET', rawUri);
      } else {
        await ReactNativeBlobUtil.config({
          path: `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`,
        }).fetch('GET', rawUri);
      }

      setMessage(
        Platform.OS === 'android'
          ? '图片已下载到下载目录'
          : '图片已保存到应用目录',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '图片下载失败');
    } finally {
      setRawDownloading(false);
    }
  };

  const rawImageSource = rawSrc || detail?.fullSrc || '';
  const imageSource = detail
    ? displayRaw && rawImageSource
      ? rawImageSource
      : detail.normalSrc
    : currentImage.album;
  const imageUri = absoluteImageUrl(imageSource, site);
  const imageRatio = detail?.height && detail.width ? detail.height / detail.width : 1;
  const imageHeight = Math.max(220, Math.round((width - 16) * imageRatio));
  const pageStyle = {backgroundColor: colors.background};
  const imageHeightStyle = {height: imageHeight};
  const titleColor = {color: colors.text};
  const mutedColor = {color: colors.textMuted};
  const controlBoxStyle = {backgroundColor: colors.surface};
  const viewCountStyle = {backgroundColor: colors.primarySoft};
  const viewCountTextStyle = {color: colors.primary};
  const messageStyle = {color: colors.danger};

  return (
    <View style={[styles.page, pageStyle]}>
      <AppHeader title="图片详情" colors={colors} onBack={onBack} />
      {loading ? (
        <LoadingState colors={colors} text="正在加载图片详情" />
      ) : !detail ? (
        <EmptyState
          title={'图片详情加载失败' + loadFailMsg}
          actionText="重试"
          colors={colors}
          onAction={() => detailQuery.refetch()}
        />
      ) : (
        <ScrollView
          {...panResponder.panHandlers}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="imagebutton"
            disabled={!imageUri}
            onPress={() => setPreviewVisible(true)}
          >
            <ThumbnailImage
              src={imageSource}
              colors={colors}
              resizeMode="contain"
              style={[styles.detailImage, imageHeightStyle]}
            />
          </Pressable>

          <Text numberOfLines={1} style={[styles.title, titleColor]}>
            {detail.title || currentImage.name || '未命名'}
          </Text>
          <Text numberOfLines={1} style={[styles.filename, mutedColor]}>
            {metadata?.filename}
          </Text>

          <View style={[styles.controlBox, controlBoxStyle]}>
            <View style={[styles.controlView]}>
              <ActionButton
                label="上一张"
                colors={colors}
                onPress={() => switchImage('prev')}
              />
            </View>
            <View style={[styles.controlViewCenter]}>
              <ActionButton
                label={rawDownloading ? '下载中' : '下载原图'}
                colors={colors}
                disabled={rawLoading || rawDownloading}
                onPress={downloadRawImage}
              />
              <ActionButton
                label={favLoading ? '请求中' : isFav ? '取消收藏' : '收藏'}
                colors={colors}
                accent={!isFav}
                disabled={favLoading}
                onPress={addFavorite}
              />
              <ActionButton
                label={
                  rawLoading ? '加载中' : displayRaw ? '已显示原图' : '查看原图'
                }
                colors={colors}
                accent
                disabled={rawLoading}
                onPress={showRawImage}
              />
            </View>
            <View style={[styles.controlView]}>
              <ActionButton
                label="下一张"
                colors={colors}
                onPress={() => switchImage('next')}
              />
            </View>
          </View>

          {metadata?.displayed ? (
            <View style={[styles.viewCountRow, viewCountStyle]}>
              <Text style={[styles.viewCountText, viewCountTextStyle]}>
                浏览量：{metadata.displayed}
              </Text>
            </View>
          ) : null}

          {message ? (
            <Text style={[styles.message, messageStyle]}>{message}</Text>
          ) : null}

          {metadata ? (
            <View style={styles.infoContainer}>
              <InfoSection
                title="图册"
                values={metadata.albums}
                colors={colors}
              />
              {metadata.artist ? (
                <InfoSection
                  title="作者"
                  values={[metadata.artist]}
                  colors={colors}
                  accent
                />
              ) : null}
              <InfoSection
                title="类别"
                values={metadata.tags}
                colors={colors}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
      <ZoomImageModal
        visible={previewVisible}
        uri={imageUri}
        onRequestClose={() => setPreviewVisible(false)}
      />
    </View>
  );
};

const extractImagePid = (href: string) => {
  const pidFromQuery = href.match(/[?&]pid=(\d+)/i)?.[1];
  if (pidFromQuery) {
    return pidFromQuery;
  }

  return href.match(/\?\/(\d+)(?:\/|$)/)?.[1] ?? null;
};

const getFavoriteState = (detail: ImageDetail | undefined) => {
  const favorites = detail?.info['Favorites:'];
  if (!Array.isArray(favorites)) {
    return false;
  }

  return favorites.some(item => item.name === 'Remove from Favorites');
};

const buildMetadata = (detail: ImageDetail) => {
  const albums = toNames(detail.info['Album name:']);
  const keywords = toNames(detail.info['Keywords:']);
  const artist = keywords[keywords.length - 1] ?? '';
  const tags = keywords
    .slice(0, -1)
    .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
  const displayed = String(detail.info['Displayed:'] ?? '').split(' ')[0];

  return {
    albums,
    artist,
    tags,
    displayed,
    filename: String(detail.info['Filename:'] ?? ''),
  };
};

const toNames = (value: string | LinkValue[] | undefined) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(item => item.name).filter(Boolean);
  }
  return String(value) ? [String(value)] : [];
};

const ensureDownloadPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const androidVersion = Number(Platform.Version);
  if (Number.isFinite(androidVersion) && androidVersion >= 29) {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  const hasPermission = await PermissionsAndroid.check(permission);
  if (hasPermission) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const buildDownloadFileName = (filename: string | undefined, uri: string) => {
  const urlFileName = getFileNameFromUrl(uri);
  const baseName = sanitizeFileName(filename || urlFileName || 'herpy-image');
  if (hasImageExtension(baseName)) {
    return baseName;
  }

  return `${baseName}${getImageExtension(urlFileName) || '.jpg'}`;
};

const getFileNameFromUrl = (uri: string) => {
  const segment = uri.split('#')[0].split('?')[0].split('/').pop() ?? '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const sanitizeFileName = (filename: string) =>
  filename.replace(/[\\/:*?"<>|]/g, '_').trim() || 'herpy-image';

const getImageExtension = (filename: string) => {
  const match = filename.match(/\.(jpe?g|png|gif|webp|bmp)$/i);
  return match ? match[0].toLowerCase() : '';
};

const hasImageExtension = (filename: string) => Boolean(getImageExtension(filename));

const getImageMimeType = (filename: string) => {
  const extension = getImageExtension(filename);
  switch (extension) {
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.bmp':
      return 'image/bmp';
    default:
      return 'image/jpeg';
  }
};

const InfoSection = ({
  title,
  values,
  colors,
  accent = false,
}: {
  title: string;
  values: string[];
  colors: ThemeColors;
  accent?: boolean;
}) => {
  if (values.length === 0) {
    return null;
  }

  const titleColor = {color: colors.text};

  return (
    <View style={styles.infoSection}>
      <Text style={[styles.infoTitle, titleColor]}>{title}</Text>
      <View style={styles.chipWrap}>
        {values.map(value => (
          <InfoChip key={value} value={value} colors={colors} accent={accent} />
        ))}
      </View>
    </View>
  );
};

const InfoChip = ({
  value,
  colors,
  accent,
}: {
  value: string;
  colors: ThemeColors;
  accent: boolean;
}) => {
  const chipColor = {backgroundColor: accent ? '#fff0cf' : colors.chip};
  const textColor = {color: accent ? colors.accent : colors.primary};

  return (
    <View style={[styles.chip, chipColor]}>
      <Text selectable style={[styles.chipText, textColor]}>
        {value}
      </Text>
    </View>
  );
};

const ActionButton = ({
  label,
  colors,
  accent = false,
  disabled = false,
  onPress,
}: {
  label: string;
  colors: ThemeColors;
  accent?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) => {
  const buttonColor = {
    backgroundColor: disabled
      ? colors.surfaceStrong
      : accent
        ? colors.accent
        : colors.primary,
  };
  const textColor = {color: disabled ? colors.textMuted : '#fff'};

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, buttonColor]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.actionText, textColor]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  detailImage: {
    width: '100%',
  },
  title: {
    marginTop: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    userSelect: 'text',
  },
  filename: {
    marginTop: 4,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 12,
  },
  controlBox: {
    minHeight: 64,
    margin: 8,
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  controlView: {
    flexDirection: 'row',
    gap: 6,
  },
  controlViewCenter: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    minWidth: 64,
    height: 40,
    borderRadius: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  viewCountRow: {
    minHeight: 34,
    marginHorizontal: 8,
    marginBottom: 6,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  viewCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  message: {
    paddingHorizontal: 12,
    marginBottom: 6,
    textAlign: 'center',
    fontSize: 13,
  },
  infoContainer: {
    paddingHorizontal: 10,
  },
  infoSection: {
    marginTop: 14,
  },
  infoTitle: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '800',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
