import React, {useMemo} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {ThumbnailImage} from './ThumbnailImage';
import type {ThemeColors} from '../tools/theme';
import type {GalleryImage} from '../tools/types';

type AlbumGridProps = {
  list: GalleryImage[];
  comicMode: boolean;
  colors: ThemeColors;
  onOpen: (item: GalleryImage) => void;
};

export const AlbumGrid = ({
  list,
  comicMode,
  colors,
  onOpen,
}: AlbumGridProps) => {
  const {width} = useWindowDimensions();
  const columnCount = width >= 720 ? 3 : 2;
  const cardWidth = Math.floor((width - 28 - (columnCount - 1) * 8) / columnCount);

  const columns = useMemo(
    () => buildColumns(list, columnCount, cardWidth),
    [cardWidth, columnCount, list],
  );

  if (comicMode) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.comicContent}
        showsVerticalScrollIndicator={false}>
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
      showsVerticalScrollIndicator={false}>
      {columns.map((column, index) => (
        <View key={`column-${index}`} style={[styles.column, {width: cardWidth}]}>
          {column.map(item => (
            <ImageCard
              key={item.href}
              item={item}
              width={cardWidth}
              colors={colors}
              onOpen={onOpen}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const buildColumns = (
  list: GalleryImage[],
  columnCount: number,
  cardWidth: number,
) => {
  const columns = Array.from({length: columnCount}, () => ({
    height: 0,
    items: [] as GalleryImage[],
  }));

  // Keep the waterfall close to the source ordering while avoiding one very
  // tall column when the original gallery mixes portrait and landscape art.
  list.forEach(item => {
    const target = columns.reduce((shortest, current) =>
      current.height < shortest.height ? current : shortest,
    );
    const imageHeight = Math.max(90, cardWidth * (item.height / item.width));
    target.height += imageHeight + 58;
    target.items.push(item);
  });

  return columns.map(column => column.items);
};

type ImageCardProps = {
  item: GalleryImage;
  width: number;
  fixedHeight?: number;
  colors: ThemeColors;
  onOpen: (item: GalleryImage) => void;
};

const ImageCard = ({item, width, fixedHeight, colors, onOpen}: ImageCardProps) => {
  const imageHeight = fixedHeight ?? Math.max(92, width * (item.height / item.width));
  const imageSizeStyle = {height: imageHeight};

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(item)}
      style={({pressed}) => [
        styles.card,
        {
          width,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}>
      <ThumbnailImage
        src={item.album}
        colors={colors}
        resizeMode={fixedHeight ? 'cover' : 'contain'}
        style={[styles.imageFill, imageSizeStyle]}
      />
      <Text
        numberOfLines={2}
        style={[styles.cardTitle, {color: colors.text}]}>
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
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  comicContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  column: {
    gap: 8,
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
