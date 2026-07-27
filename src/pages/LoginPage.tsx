import React, {useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {apiLogin, getLoginOutHref} from '../apis/auth';
import {AppHeader} from '../component/AppHeader';
import {toast} from '../component/Toast';
import {userActions} from '../store';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {clearSiteQueryCache} from '../query/cache';
import type {ThemeColors} from '../tools/theme';

type LoginPageProps = {
  colors: ThemeColors;
  onBack: () => void;
  onSuccess: () => void;
};

export const LoginPage = ({colors, onBack, onSuccess}: LoginPageProps) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const site = useAppSelector(state => state.app.site);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useMutation({
    mutationFn: ({username: loginUsername, password: loginPassword}: {
      username: string;
      password: string;
    }) => apiLogin(loginUsername, loginPassword, site, `${site.baseUrl}/`),
  });
  const submitting = loginMutation.isPending;

  const canSubmit = Boolean(username.trim() && password && !submitting);

  const submitLogin = async () => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      toast.error('请输入用户名/邮箱和密码');
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({
        username: normalizedUsername,
        password,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      if (result.success) {
        await clearSiteQueryCache(queryClient, site.baseUrl);
        dispatch(userActions.setLoginState(getLoginOutHref(result.data).href));
        setPassword('');
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录请求失败');
    }
  };

  const openRegister = async () => {
    const registerUrl = `${site.baseUrl}/register.php`;
    const supported = await Linking.canOpenURL(registerUrl);
    if (supported) {
      await Linking.openURL(registerUrl);
      return;
    }

    toast.error('无法打开注册链接');
  };

  return (
    <View style={[styles.page, {backgroundColor: colors.background}]}>
      <AppHeader title="登录" colors={colors} onBack={onBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.form,
              {backgroundColor: colors.surface, borderColor: colors.border},
            ]}>
            <Text style={[styles.label, {color: colors.text}]}>
              用户名/邮箱
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setUsername}
              placeholder="请输入用户名或邮箱"
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={username}
            />

            <Text style={[styles.label, {color: colors.text}]}>密码</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setPassword}
              onSubmitEditing={submitLogin}
              placeholder="请输入密码"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              secureTextEntry
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={password}
            />

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={submitLogin}
                style={({pressed}) => [
                  styles.primaryButton,
                  {
                    backgroundColor: canSubmit
                      ? colors.primary
                      : colors.surfaceStrong,
                    opacity: pressed ? 0.86 : 1,
                  },
                ]}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>登录</Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={openRegister}
                style={({pressed}) => [
                  styles.secondaryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed
                      ? colors.primarySoft
                      : colors.surface,
                  },
                ]}>
                <Text style={[styles.secondaryButtonText, {color: colors.text}]}>
                  注册
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 18,
  },
  form: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 18,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    height: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    marginBottom: 16,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    height: 46,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
