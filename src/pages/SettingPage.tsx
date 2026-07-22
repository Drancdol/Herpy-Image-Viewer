import React from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {apiLogout} from '../apis/auth';
import {AppHeader} from '../component/AppHeader';
import {SwitchRow} from '../component/SwitchRow';
import {toast} from '../component/Toast';
import {clearAuthorizationCookies} from '../storage/authorization';
import {appActions, userActions} from '../store';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {clearSiteQueryCache} from '../query/cache';
import type {ThemeColors} from '../tools/theme';

type SettingPageProps = {
  colors: ThemeColors;
  onBack: () => void;
  onLogin: () => void;
};

export const SettingPage = ({colors, onBack, onLogin}: SettingPageProps) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const site = useAppSelector(state => state.app.site);
  const theme = useAppSelector(state => state.app.theme);
  const settings = useAppSelector(state => state.app.settings);
  const loggedIn = useAppSelector(state => state.user.loggedIn);
  const loginOutHref = useAppSelector(state => state.user.loginOutHref);
  const logoutMutation = useMutation({
    mutationFn: (href: string) => apiLogout(href, site),
  });
  const loggingOut = logoutMutation.isPending;

  const handleAuthPress = async () => {
    if (!loggedIn) {
      onLogin();
      return;
    }

    if (loggingOut) {
      return;
    }

    if (!loginOutHref) {
      toast.error('退出链接已失效，请返回首页刷新后重试');
      return;
    }

    try {
      const result = await logoutMutation.mutateAsync(loginOutHref);
      if (!result.success) {
        toast.error('退出登录失败，请稍后重试');
        return;
      }

      clearAuthorizationCookies();
      await clearSiteQueryCache(queryClient, site.baseUrl);
      dispatch(userActions.setLoginState(''));
      toast.success('已退出登录');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '退出登录请求失败');
    }
  };

  return (
    <View style={[styles.page, {backgroundColor: colors.background}]}>
      <AppHeader title="设置" colors={colors} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          disabled={loggingOut}
          onPress={handleAuthPress}
          style={({pressed}) => [
            styles.actionRow,
            {
              backgroundColor: pressed ? colors.primarySoft : colors.surface,
              borderColor: colors.border,
              opacity: loggingOut ? 0.64 : 1,
            },
          ]}>
          <View style={styles.actionTextBox}>
            <Text style={[styles.actionTitle, {color: colors.text}]}>
              {loggedIn ? '退出登录' : '登录'}
            </Text>
            <Text style={[styles.actionDescription, {color: colors.textMuted}]}>
              {loggedIn
                ? '清除本地保存的登录 Cookie'
                : '登录 Herpy 账号以获取 Cookie'}
            </Text>
          </View>
          <Text
            style={[
              styles.actionValue,
              {color: loggedIn ? colors.danger : colors.primary},
            ]}>
            {loggingOut ? '退出中' : loggedIn ? '退出' : '进入'}
          </Text>
        </Pressable>
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
  actionRow: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTextBox: {
    flex: 1,
    paddingRight: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  actionValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
