import React, {useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  apiUpdateUserPassword,
  apiUpdateUserProfile,
  type UserProfileUpdateResult,
  type UserProfileUpdateValues,
} from '../apis/auth';
import {AppHeader} from '../component/AppHeader';
import {toast} from '../component/Toast';
import type {UserProfilePageData} from '../query/fetchers';
import {userProfileQueryKey} from '../query/keys';
import {UserDataKey} from '../storage/user';
import {userActions} from '../store';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import type {ThemeColors} from '../tools/theme';

export type UserUpdateMode = 'profile' | 'password';

type UserUpdatePageProps = {
  colors: ThemeColors;
  mode: UserUpdateMode;
  onBack: () => void;
};

const updateProfileFields = (
  data: UserProfilePageData | undefined,
  values: UserProfileUpdateValues,
  loginOutHref: string,
): UserProfilePageData | undefined => {
  if (!data || data.loginRequired) {
    return data;
  }

  return {
    ...data,
    loginOutHref: loginOutHref || data.loginOutHref,
    user: {
      ...data.user,
      ...values,
    },
  };
};

const updateLoginOutHref = (
  data: UserProfilePageData | undefined,
  loginOutHref: string,
): UserProfilePageData | undefined => {
  if (!data || data.loginRequired || !loginOutHref) {
    return data;
  }

  return {
    ...data,
    loginOutHref,
  };
};

export const UserUpdatePage = ({colors, mode, onBack}: UserUpdatePageProps) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const site = useAppSelector(state => state.app.site);
  const loginOutHref = useAppSelector(state => state.user.loginOutHref);
  const user = useAppSelector(state => state.user.user);
  const [location, setLocation] = useState(user.location);
  const [interests, setInterests] = useState(user.interests);
  const [website, setWebsite] = useState(user.website);
  const [occupation, setOccupation] = useState(user.occupation);
  const [biography, setBiography] = useState(user.biography);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordAgain, setNewPasswordAgain] = useState('');
  const queryKey = userProfileQueryKey(site.baseUrl);
  const profileMutation = useMutation({
    mutationFn: (values: UserProfileUpdateValues) =>
      apiUpdateUserProfile(values, loginOutHref, site),
  });
  const passwordMutation = useMutation({
    mutationFn: ({current, next}: {current: string; next: string}) =>
      apiUpdateUserPassword(current, next, loginOutHref, site),
  });
  const submitting = profileMutation.isPending || passwordMutation.isPending;

  const synchronizeLoginOutHref = (result: UserProfileUpdateResult) => {
    if (!result.loginOutHref) {
      return;
    }

    dispatch(userActions.setLoginState(result.loginOutHref));
    queryClient.setQueryData<UserProfilePageData>(queryKey, data =>
      updateLoginOutHref(data, result.loginOutHref),
    );
  };

  const submitProfile = async () => {
    if (submitting) {
      return;
    }

    const values = {location, interests, website, occupation, biography};

    try {
      const result = await profileMutation.mutateAsync(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      synchronizeLoginOutHref(result);
      const userUpdates: {key: UserDataKey; value: string}[] = [
        {key: UserDataKey.Location, value: values.location},
        {key: UserDataKey.Interests, value: values.interests},
        {key: UserDataKey.Website, value: values.website},
        {key: UserDataKey.Occupation, value: values.occupation},
        {key: UserDataKey.Biography, value: values.biography},
      ];
      userUpdates.forEach(update =>
        dispatch(userActions.setOneOfUserData(update)),
      );
      queryClient.setQueryData<UserProfilePageData>(queryKey, data =>
        updateProfileFields(data, values, result.loginOutHref),
      );
      queryClient.invalidateQueries({queryKey}).catch(() => undefined);
      toast.success(result.message);
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新个人信息失败');
    }
  };

  const submitPassword = async () => {
    if (submitting) {
      return;
    }

    if (!currentPassword || !newPassword || !newPasswordAgain) {
      toast.error('请完整填写密码信息');
      return;
    }

    if (newPassword !== newPasswordAgain) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    try {
      const result = await passwordMutation.mutateAsync({
        current: currentPassword,
        next: newPassword,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      synchronizeLoginOutHref(result);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordAgain('');
      queryClient.invalidateQueries({queryKey}).catch(() => undefined);
      toast.success(result.message);
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '修改密码失败');
    }
  };

  const title = mode === 'profile' ? '修改信息' : '修改密码';

  return (
    <View style={[styles.page, {backgroundColor: colors.background}]}>
      <AppHeader title={title} colors={colors} onBack={onBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.form,
              {backgroundColor: colors.surface, borderColor: colors.border},
            ]}
          >
            {mode === 'profile' ? (
              <>
                <FormInput
                  colors={colors}
                  label="所在地"
                  onChangeText={setLocation}
                  value={location}
                />
                <FormInput
                  colors={colors}
                  label="兴趣"
                  onChangeText={setInterests}
                  value={interests}
                />
                <FormInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  colors={colors}
                  keyboardType="url"
                  label="网站"
                  onChangeText={setWebsite}
                  value={website}
                />
                <FormInput
                  colors={colors}
                  label="职业"
                  onChangeText={setOccupation}
                  value={occupation}
                />
                <FormInput
                  colors={colors}
                  label="个人简介"
                  multiline
                  onChangeText={setBiography}
                  value={biography}
                />
                <SubmitButton
                  colors={colors}
                  disabled={submitting}
                  loading={submitting}
                  onPress={submitProfile}
                  title="保存信息"
                />
              </>
            ) : (
              <>
                <FormInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  colors={colors}
                  label="当前密码"
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  value={currentPassword}
                />
                <FormInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  colors={colors}
                  label="新密码"
                  onChangeText={setNewPassword}
                  secureTextEntry
                  value={newPassword}
                />
                <FormInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  colors={colors}
                  label="确认新密码"
                  onChangeText={setNewPasswordAgain}
                  onSubmitEditing={submitPassword}
                  returnKeyType="done"
                  secureTextEntry
                  value={newPasswordAgain}
                />
                <SubmitButton
                  colors={colors}
                  disabled={submitting}
                  loading={submitting}
                  onPress={submitPassword}
                  title="保存密码"
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

type FormInputProps = {
  autoCapitalize?: 'none';
  autoCorrect?: boolean;
  colors: ThemeColors;
  keyboardType?: 'default' | 'url';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done';
  secureTextEntry?: boolean;
  value: string;
};

const FormInput = ({
  autoCapitalize,
  autoCorrect,
  colors,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  onSubmitEditing,
  returnKeyType,
  secureTextEntry,
  value,
}: FormInputProps) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, {color: colors.text}]}>{label}</Text>
    <TextInput
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
      secureTextEntry={secureTextEntry}
      style={[
        styles.input,
        multiline && styles.multilineInput,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.text,
        },
      ]}
      textAlignVertical={multiline ? 'top' : 'center'}
      value={value}
    />
  </View>
);

type SubmitButtonProps = {
  colors: ThemeColors;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
  title: string;
};

const SubmitButton = ({
  colors,
  disabled,
  loading,
  onPress,
  title,
}: SubmitButtonProps) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={({pressed}) => [
      styles.submitButton,
      {
        backgroundColor: disabled ? colors.surfaceStrong : colors.primary,
        opacity: pressed ? 0.86 : 1,
      },
    ]}
  >
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.submitText}>{title}</Text>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  form: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 112,
    paddingTop: 11,
    paddingBottom: 11,
  },
  submitButton: {
    minHeight: 46,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
