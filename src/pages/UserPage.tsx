import React, {useEffect, useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  RefreshControl,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {AppHeader} from '../component/AppHeader';
import {EmptyState} from '../component/EmptyState';
import {LoadingState} from '../component/LoadingState';
import {fetchUserProfile} from '../query/fetchers';
import {userProfileQueryKey} from '../query/keys';
import {clearAuthorizationCookies} from '../storage/authorization';
import type {UserData} from '../storage/user';
import {userActions} from '../store';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';
import type {UserUpdateMode} from './UserUpdatePage';

type UserPageProps = {
  colors: ThemeColors;
  onBack: () => void;
  onLogin: () => void;
  onUpdate: (mode: UserUpdateMode) => void;
};

type ProfileField = {
  label: string;
  value: string;
};

type ProfileSection = {
  title: string;
  fields: ProfileField[];
};

const profileSections = (user: UserData): ProfileSection[] =>
  [
    {
      title: '账户信息',
      fields: [
        {label: '状态', value: user.status},
        {label: '用户组', value: user.group},
        {label: '加入时间', value: user.joinDate},
        {label: '邮箱', value: user.email},
      ],
    },
    {
      title: '个人资料',
      fields: [
        {label: '所在地', value: user.location},
        {label: '兴趣', value: user.interests},
        {label: '网站', value: user.website},
        {label: '职业', value: user.occupation},
        {label: '个人简介', value: user.biography},
      ],
    },
    {
      title: '活动记录',
      fields: [
        {label: '磁盘用量', value: user.diskUsage},
        {label: '已上传文件', value: user.filesUploaded},
        {label: '最新评论', value: user.lastComment},
        {label: '最后上传文件', value: user.lastUploadedFile},
      ],
    },
  ]
    .map(section => ({
      ...section,
      fields: section.fields.filter(field => Boolean(field.value.trim())),
    }))
    .filter(section => section.fields.length > 0);

export const UserPage = ({
  colors,
  onBack,
  onLogin,
  onUpdate,
}: UserPageProps) => {
  const dispatch = useAppDispatch();
  const site = useAppSelector(state => state.app.site);
  const {data, error, isError, isFetching, isPending, refetch} = useQuery({
    queryKey: userProfileQueryKey(site.baseUrl),
    queryFn: ({signal}) => fetchUserProfile(site, signal),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.loginRequired) {
      clearAuthorizationCookies();
      dispatch(userActions.setLoginState(''));
      dispatch(userActions.clearUserData());
      return;
    }

    dispatch(userActions.setUserData(data.user));
    dispatch(userActions.setLoginState(data.loginOutHref));
  }, [data, dispatch]);

  const user = data && !data.loginRequired ? data.user : null;
  const sections = useMemo(
    () => (user ? profileSections(user) : []),
    [user],
  );
  const loadFailMsg = error instanceof Error ? error.message : '';

  let content: React.ReactNode;

  if (isPending) {
    content = <LoadingState colors={colors} text="正在加载个人资料" />;
  } else if (data?.loginRequired) {
    content = (
      <EmptyState
        title="登录后可查看个人资料"
        actionText="去登录"
        colors={colors}
        onAction={onLogin}
      />
    );
  } else if (isError && !data) {
    content = (
      <EmptyState
        title={`个人资料加载失败${loadFailMsg ? `：${loadFailMsg}` : ''}`}
        actionText="重试"
        colors={colors}
        onAction={() => refetch()}
      />
    );
  } else if (user) {
    const summary = [user.status, user.group].filter(Boolean).join(' | ');
    const initial = user.username.trim().charAt(0).toUpperCase() || '?';

    content = (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            refreshing={isFetching && !isPending}
            tintColor={colors.primary}
            onRefresh={() => refetch()}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.summary,
            {backgroundColor: colors.surface, borderColor: colors.border},
          ]}>
          <View style={[styles.avatar, {backgroundColor: colors.primary}]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.summaryText}>
            <Text selectable style={[styles.username, {color: colors.text}]}>
              {user.username}
            </Text>
            <Text style={[styles.summaryMeta, {color: colors.textMuted}]}>
              {summary || 'Herpy 用户'}
            </Text>
          </View>
        </View>

        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>
              {section.title}
            </Text>
            <View
              style={[
                styles.fieldList,
                {backgroundColor: colors.surface, borderColor: colors.border},
              ]}>
              {section.fields.map(field => (
                <View
                  key={field.label}
                  style={[
                    styles.field,
                    {borderBottomColor: colors.border},
                  ]}>
                  <Text style={[styles.fieldLabel, {color: colors.textMuted}]}>
                    {field.label}
                  </Text>
                  <Text selectable style={[styles.fieldValue, {color: colors.text}]}>
                    {field.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="修改信息"
            onPress={() => onUpdate('profile')}
            style={({pressed}) => [
              styles.secondaryAction,
              {
                backgroundColor: pressed ? colors.primarySoft : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.secondaryActionText, {color: colors.text}]}>
              修改信息
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="修改密码"
            onPress={() => onUpdate('password')}
            style={({pressed}) => [
              styles.primaryAction,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={styles.primaryActionText}>修改密码</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  } else {
    content = <EmptyState title="没有可显示的个人资料" colors={colors} />;
  }

  return (
    <View style={[styles.page, {backgroundColor: colors.background}]}>
      <AppHeader title="个人资料" colors={colors} onBack={onBack} />
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  summary: {
    minHeight: 100,
    padding: 16,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryMeta: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    marginBottom: 8,
    paddingHorizontal: 2,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  field: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 17,
  },
  fieldValue: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
  },
  primaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
