import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  type ImageResizeMode,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type {ThemeColors} from '../tools/theme';
import {absoluteImageUrl} from '../tools/process';
import {useAppSelector} from '../store/hooks';

type ThumbnailImageProps = {
  src?: string;
  colors: ThemeColors;
  resizeMode?: ImageResizeMode;
  style?: StyleProp<ViewStyle>;
};

export const ThumbnailImage = ({
  src,
  colors,
  resizeMode = 'cover',
  style,
}: ThumbnailImageProps) => {
  const site = useAppSelector(state => state.app.site);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const uri = useMemo(() => absoluteImageUrl(src, site), [site, src]);

  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, {backgroundColor: colors.surfaceStrong}, style]}>
        <Text style={[styles.placeholderText, {color: colors.textMuted}]}>
          加载失败
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, {backgroundColor: colors.surfaceStrong}, style]}>
      {!loaded ? (
        <ActivityIndicator
          color={colors.primary}
          size="small"
          style={styles.indicator}
        />
      ) : null}
      <Image
        source={{uri}}
        resizeMode={resizeMode}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={styles.image}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderText: {
    fontSize: 12,
  },
});
