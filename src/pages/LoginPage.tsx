import React, {useState} from 'react';
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
import {apiLogin} from '../apis/apiHerpy';
import {AppHeader} from '../component/AppHeader';
import {useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';

type LoginPageProps = {
  colors: ThemeColors;
  onBack: () => void;
};

type MessageType = 'success' | 'error' | 'info';

export const LoginPage = ({colors, onBack}: LoginPageProps) => {
  const site = useAppSelector(state => state.app.site);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('info');

  const canSubmit = Boolean(username.trim() && password && !submitting);

  const submitLogin = async () => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setMessageType('error');
      setMessage('请输入用户名/邮箱和密码');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const result = await apiLogin(
        normalizedUsername,
        password,
        site,
        `${site.baseUrl}/`,
      );

      setMessageType(result.success ? 'success' : 'error');
      setMessage(result.message);
      if (result.success) {
        setPassword('');
      }
    } catch (error) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : '登录请求失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openRegister = async () => {
    const registerUrl = `${site.baseUrl}/register.php`;
    const supported = await Linking.canOpenURL(registerUrl);
    if (supported) {
      await Linking.openURL(registerUrl);
      return;
    }

    setMessageType('error');
    setMessage('无法打开注册链接');
  };

  const messageColor =
    messageType === 'success'
      ? colors.primary
      : messageType === 'error'
        ? colors.danger
        : colors.textMuted;

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

            {message ? (
              <Text style={[styles.message, {color: messageColor}]}>
                {message}
              </Text>
            ) : null}

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
  message: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
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
