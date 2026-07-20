import React, {useCallback, useEffect, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getLoginOutHref} from '../apis/auth';
import {apiClassificationSwitchPage, apiMainPage} from '../apis/gallery';
import {AppHeader} from '../component/AppHeader';
import {EmptyState} from '../component/EmptyState';
import {GalleryPage} from './GalleryPage';
import {LoadingState} from '../component/LoadingState';
import {ThumbnailImage} from '../component/ThumbnailImage';
import {appActions, userActions} from '../store';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';
import type {AlbumSummary, GalleryImage, MainCategory} from '../tools/types';
import {parseMainPage} from '../tools/process';

type IndexPageProps = {
  colors: ThemeColors;
  onMenu: () => void;
  onSearch: () => void;
  onOpenImage: (item: GalleryImage) => void;
};

export const IndexPage = ({
  colors,
  onMenu,
  onSearch,
  onOpenImage,
}: IndexPageProps) => {
  const dispatch = useAppDispatch();
  const site = useAppSelector(state => state.app.site);
  const selectedAlbumHref = useAppSelector(
    state => state.app.selectedAlbumHref,
  );

  const loadAlbumHtml = useCallback(
    async (page: number) => {
      if (!selectedAlbumHref) {
        return '';
      }
      const response = await apiClassificationSwitchPage(
        selectedAlbumHref,
        page,
        site,
      );
      if (response.statusCode !== 200) {
        throw new Error(`album request failed: ${response.statusCode}`);
      }
      return response.data;
    },
    [selectedAlbumHref, site],
  );

  return (
    <View style={[styles.page, {backgroundColor: colors.background}]}>
      <AppHeader
        colors={colors}
        onMenu={onMenu}
        onSearch={onSearch}
        searchPlaceholder="搜索 Herpy 图片"
      />
      {selectedAlbumHref ? (
        <GalleryPage
          colors={colors}
          title={selectedAlbumHref}
          requestKey={selectedAlbumHref}
          loadHtml={loadAlbumHtml}
          onOpenImage={onOpenImage}
          onBackToMain={() => dispatch(appActions.selectAlbum(null))}
        />
      ) : (
        <MainPageContent colors={colors} />
      )}
    </View>
  );
};

const MainPageContent = ({colors}: {colors: ThemeColors}) => {
  const dispatch = useAppDispatch();
  const site = useAppSelector(state => state.app.site);
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFail, setLoadFail] = useState(false);
  const [loadFailMsg, setLoadFailMsg] = useState('');

  const loadMainPage = useCallback(async () => {
    setLoading(true);
    setLoadFail(false);
    try {
      const response = await apiMainPage(site);
      if (response.statusCode !== 200) {
        throw new Error(`main request failed: ${response.statusCode}`);
      }
      dispatch(userActions.setLoginState(getLoginOutHref(response.data)));
      setCategories(parseMainPage(response.data));
    } catch(error: any) {
      setLoadFailMsg(error.message);
      setLoadFail(true);
    } finally {
      setLoading(false);
    }
  }, [dispatch, site]);

  useEffect(() => {
    loadMainPage();
  }, [loadMainPage]);

  if (loading) {
    return <LoadingState colors={colors} text="正在加载分类" />;
  }

  if (loadFail) {
    return (
      <EmptyState
        title={'主页加载失败'+loadFailMsg}
        actionText="重试"
        colors={colors}
        onAction={loadMainPage}
      />
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="没有解析到分类"
        actionText="刷新"
        colors={colors}
        onAction={loadMainPage}
      />
    );
  }

  return (
    <ScrollView
      style={styles.mainScroll}
      contentContainerStyle={styles.mainContent}
      showsVerticalScrollIndicator={false}>
      {categories.map(category => (
        <View
          key={category.title.href}
          style={[styles.category, {backgroundColor: colors.surface}]}>
          <View style={[styles.categoryTitle, {backgroundColor: colors.primary}]}>
            <Text style={styles.categoryText}>{category.title.name}</Text>
          </View>
          {category.content.map(item => (
            <AlbumRow
              key={item.href}
              item={item}
              colors={colors}
              onPress={() => dispatch(appActions.selectAlbum(item.href))}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const AlbumRow = ({
  item,
  colors,
  onPress,
}: {
  item: AlbumSummary;
  colors: ThemeColors;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({pressed}) => [
      styles.albumRow,
      {
        backgroundColor: pressed ? colors.primarySoft : colors.surface,
        borderColor: colors.border,
      },
    ]}>
    <ThumbnailImage
      src={item.album}
      colors={colors}
      resizeMode="cover"
      style={styles.albumCover}
    />
    <View style={styles.albumTextBox}>
      <Text numberOfLines={1} style={[styles.albumTitle, {color: colors.text}]}>
        {item.subTitle}
      </Text>
      <Text numberOfLines={2} style={[styles.albumDesc, {color: colors.textMuted}]}>
        {item.name}
      </Text>
      {item.desc.slice(0, 2).map(desc => (
        <Text
          key={desc}
          numberOfLines={1}
          style={[styles.albumMeta, {color: colors.textMuted}]}>
          {desc}
        </Text>
      ))}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    padding: 12,
    paddingBottom: 24,
  },
  category: {
    borderRadius: 6,
    marginBottom: 14,
    overflow: 'hidden',
  },
  categoryTitle: {
    minHeight: 42,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  categoryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  albumRow: {
    minHeight: 96,
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  albumCover: {
    width: 76,
    height: 76,
    borderRadius: 5,
  },
  albumTextBox: {
    flex: 1,
    paddingLeft: 12,
  },
  albumTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  albumDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  albumMeta: {
    marginTop: 3,
    fontSize: 12,
  },
});
