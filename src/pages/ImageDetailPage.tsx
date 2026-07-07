import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {apiGetImageDetail, apiGetSingleImgUrl} from '../apis/apiHerpy';
import {AppHeader} from '../component/AppHeader';
import {EmptyState} from '../component/EmptyState';
import {LoadingState} from '../component/LoadingState';
import {ThumbnailImage} from '../component/ThumbnailImage';
import {useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';
import type {GalleryImage, ImageDetail, LinkValue} from '../tools/types';
import {
  absoluteImageUrl,
  parseImageDetail,
  parseRawImageSrc,
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
  const {width} = useWindowDimensions();
  const [currentImage, setCurrentImage] = useState(image);
  const [detail, setDetail] = useState<ImageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFail, setLoadFail] = useState(false);
  const [rawLoading, setRawLoading] = useState(false);
  const [displayRaw, setDisplayRaw] = useState(false);
  const [message, setMessage] = useState('');
  const [loadFailMsg, setLoadFailMsg] = useState('');

  const detailRef = useRef<ImageDetail | null>(null);

  useEffect(() => {
    setCurrentImage(image);
  }, [image]);

  const resolveRawImage = useCallback(
    async (target: ImageDetail) => {
      if (target.fullSrc) {
        return target.fullSrc;
      }
      if (!target.fullHref) {
        return '';
      }

      setRawLoading(true);
      try {
        const response = await apiGetSingleImgUrl(target.fullHref, site);
        if (response.statusCode !== 200) {
          return '';
        }
        return parseRawImageSrc(response.data);
      } finally {
        setRawLoading(false);
      }
    },
    [site],
  );

  const loadDetail = useCallback(
    async (target: GalleryImage) => {
      setLoading(true);
      setLoadFail(false);
      setDisplayRaw(false);
      setMessage('');
      try {
        const response = await apiGetImageDetail(target.href, site);
        if (response.statusCode !== 200) {
          throw new Error(`detail request failed: ${response.statusCode}`);
        }

        const parsed = parseImageDetail(response.data, target.href);
        if (!parsed) {
          throw new Error('detail parse failed');
        }

        setDetail(parsed);
        detailRef.current = parsed;

        if (settings.preLoadRawImg) {
          // RN Android does not have uniapp's plus.downloader. Prefetch keeps
          // the feature useful without creating a custom native download layer.
          const rawSrc = await resolveRawImage(parsed);
          if (rawSrc) {
            parsed.fullSrc = rawSrc;
            Image.prefetch(absoluteImageUrl(rawSrc, site));
            setDetail({...parsed});
          }
        }
      } catch(e:any) {
        setLoadFailMsg(e.message);
        setLoadFail(true);
      } finally {
        setLoading(false);
      }
    },
    [resolveRawImage, settings.preLoadRawImg, site],
  );

  useEffect(() => {
    loadDetail(currentImage);
  }, [currentImage, loadDetail]);

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
      setCurrentImage(upNextCache[nextIndex]);
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
    if (!detailRef.current) {
      return;
    }

    const rawSrc = await resolveRawImage(detailRef.current);
    if (!rawSrc) {
      setMessage('原图地址加载失败');
      return;
    }

    detailRef.current.fullSrc = rawSrc;
    setDetail({...detailRef.current});
    setDisplayRaw(true);
  };

  const metadata = detail ? buildMetadata(detail) : null;
  const imageSource = detail
    ? displayRaw && detail.fullSrc
      ? detail.fullSrc
      : detail.normalSrc
    : currentImage.album;
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
      ) : loadFail || !detail ? (
        <EmptyState
          title={'图片详情加载失败' + loadFailMsg}
          actionText="重试"
          colors={colors}
          onAction={() => loadDetail(currentImage)}
        />
      ) : (
        <ScrollView
          {...panResponder.panHandlers}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => setDisplayRaw(false)}>
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
            <ActionButton
              label="上一张"
              colors={colors}
              onPress={() => switchImage('prev')}
            />
            {metadata?.displayed ? (
              <View style={[styles.viewCount, viewCountStyle]}>
                <Text style={[styles.viewCountText, viewCountTextStyle]}>
                  浏览量：{metadata.displayed}
                </Text>
              </View>
            ) : null}
            <ActionButton
              label={
                rawLoading ? '加载中' : displayRaw ? '已显示原图' : '查看原图'
              }
              colors={colors}
              accent
              disabled={rawLoading}
              onPress={showRawImage}
            />
            <ActionButton
              label="下一张"
              colors={colors}
              onPress={() => switchImage('next')}
            />
          </View>

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
    </View>
  );
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
      style={[styles.actionButton, buttonColor]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.actionText, textColor]}>
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
    alignItems: 'center',
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
  viewCount: {
    minHeight: 40,
    flex: 1,
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
