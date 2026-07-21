import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ThumbnailImage } from './ThumbnailImage';
import type { ThemeColors } from '../tools/theme';
import type { GalleryImage } from '../tools/types';

type AlbumGridProps = {
  list: GalleryImage[];
  comicMode: boolean;
  colors: ThemeColors;
  onOpen: (item: GalleryImage) => void;
};

const MASONRY_GAP = 8;
const CARD_TITLE_HEIGHT = 42;
const CARD_BORDER_HEIGHT = StyleSheet.hairlineWidth * 2;

export const AlbumGrid = ({
  list,
  comicMode,
  colors,
  onOpen,
}: AlbumGridProps) => {
  const { width } = useWindowDimensions();
  const columnCount = width >= 360 ? 3 : 2;
  const cardWidth = Math.floor(
    (width - 28 - (columnCount - 1) * 8) / columnCount,
  );

  const masonryLayout = useMemo(
    () => {
      let data = buildMasonryLayout(list, columnCount, cardWidth);
      console.log(data)
      return data;
    },
    [cardWidth, columnCount, list],
  );

  if (comicMode) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.comicContent}
        showsVerticalScrollIndicator={false}
      >
        {list.map(item => (
          <ImageCard
            key={item.href}
            item={item}
            width={cardWidth}
            fixedHeight={Math.round(cardWidth * 1.3)}
            colors={colors}
            onOpen={onOpen}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.masonryContent}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.masonryGrid,
          { height: masonryLayout.height, width: masonryLayout.width },
        ]}
      >
        {masonryLayout.items.map(({ item, left, top }) => (
          <ImageCard
            key={item.href}
            item={item}
            width={cardWidth}
            colors={colors}
            onOpen={onOpen}
            containerStyle={[styles.positionedCard, { left, top }]}
          />
        ))}
      </View>
    </ScrollView>
  );
};

type MasonryItem = {
  item: GalleryImage;
  order: number;
  left: number;
  top: number;
};

type MasonryLayout = {
  items: MasonryItem[];
  width: number;
  height: number;
};

const buildMasonryLayout = (
  list: GalleryImage[],
  columnCount: number,
  cardWidth: number,
): MasonryLayout => {
  const columns = Array.from({ length: columnCount }, () => ({
    height: 0,
  }));

  const items = list.map((item, order) => {
    const columnIndex = columns.reduce(
      (shortestIndex, current, index) =>
        current.height < columns[shortestIndex].height ? index : shortestIndex,
      0,
    );

    const target = columns[columnIndex];
    const top = target.height;
    target.height +=
      getImageHeight(item, cardWidth) +
      CARD_TITLE_HEIGHT +
      CARD_BORDER_HEIGHT +
      MASONRY_GAP;

    return {
      item,
      order,
      left: columnIndex * (cardWidth + MASONRY_GAP),
      top,
    };
  });

  return {
    // The source-order tag makes thumbnails mount and start loading in source
    // order even though their visual positions are distributed by column.
    items: items.sort((first, second) => first.order - second.order),
    width: columnCount * cardWidth + (columnCount - 1) * MASONRY_GAP,
    height:
      Math.max(0, ...columns.map(column => column.height)) -
      (items.length > 0 ? MASONRY_GAP : 0),
  };
};

const getImageHeight = (item: GalleryImage, width: number) =>
  Math.max(92, width * (item.height / item.width));

type ImageCardProps = {
  item: GalleryImage;
  width: number;
  fixedHeight?: number;
  colors: ThemeColors;
  onOpen: (item: GalleryImage) => void;
  containerStyle?: StyleProp<ViewStyle>;
};

const ImageCard = ({
  item,
  width,
  fixedHeight,
  colors,
  onOpen,
  containerStyle,
}: ImageCardProps) => {
  const imageHeight = fixedHeight ?? getImageHeight(item, width);
  const imageSizeStyle = { height: imageHeight };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(item)}
      style={({ pressed }) => [
        styles.card,
        containerStyle,
        {
          width,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <ThumbnailImage
        src={item.album}
        colors={colors}
        resizeMode={fixedHeight ? 'cover' : 'contain'}
        style={[styles.imageFill, imageSizeStyle]}
      />
      <Text
        numberOfLines={2}
        style={[styles.cardTitle, { color: colors.text }]}
      >
        {item.name || '未命名'}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  masonryContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
  },
  masonryGrid: {
    position: 'relative',
  },
  comicContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MASONRY_GAP,
  },
  positionedCard: {
    position: 'absolute',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    overflow: 'hidden',
  },
  imageFill: {
    width: '100%',
  },
  cardTitle: {
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
});
