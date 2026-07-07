import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {AppHeader} from '../component/AppHeader';
import {SwitchRow} from '../component/SwitchRow';
import {appActions} from '../store';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';

type SettingPageProps = {
  colors: ThemeColors;
  onBack: () => void;
};

export const SettingPage = ({colors, onBack}: SettingPageProps) => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.app.theme);
  const settings = useAppSelector(state => state.app.settings);

  return (
    <View style={[styles.page, {backgroundColor: colors.background}]}>
      <AppHeader title="设置" colors={colors} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <SwitchRow
          title={`${theme === 'dark' ? '暗色' : '亮色'}主题`}
          value={theme === 'dark'}
          colors={colors}
          onValueChange={value =>
            dispatch(appActions.setTheme(value ? 'dark' : 'light'))
          }
        />
        <SwitchRow
          title={`${settings.comicMode ? '对齐' : '高度自适应'}排版`}
          description="高度自适应更接近瀑布流，对齐排版更适合按原网页顺序浏览。"
          value={settings.comicMode}
          colors={colors}
          onValueChange={value =>
            dispatch(appActions.updateSetting({key: 'comicMode', value}))
          }
        />
        <SwitchRow
          title={`${settings.preLoadRawImg ? '开启' : '关闭'}详情页预加载原图`}
          description="开启后详情页会提前请求原图地址，可能增加流量消耗。"
          value={settings.preLoadRawImg}
          colors={colors}
          onValueChange={value =>
            dispatch(appActions.updateSetting({key: 'preLoadRawImg', value}))
          }
        />
        <SwitchRow
          title={`${settings.openSlideSwitch ? '开启' : '关闭'}左右滑动切换上下页`}
          value={settings.openSlideSwitch}
          colors={colors}
          onValueChange={value =>
            dispatch(appActions.updateSetting({key: 'openSlideSwitch', value}))
          }
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    padding: 12,
    gap: 12,
  },
});
