import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Pressable, TextInput} from 'react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
  apiUpdateUserPassword,
  apiUpdateUserProfile,
} from '../src/apis/auth';
import {UserUpdatePage} from '../src/pages/UserUpdatePage';
import {userProfileQueryKey} from '../src/query/keys';
import {appReducer} from '../src/store/appSlice';
import {userActions, userReducer} from '../src/store/user';
import {THEMES} from '../src/tools/theme';

jest.mock('../src/apis/auth', () => ({
  apiUpdateUserPassword: jest.fn(),
  apiUpdateUserProfile: jest.fn(),
}));

jest.mock('../src/component/AppHeader', () => ({
  AppHeader: () => null,
}));

jest.mock('../src/component/Toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const user = {
  username: 'alice',
  status: 'Active',
  joinDate: '2024-01-02',
  group: 'Members',
  email: 'alice@example.com',
  location: 'Shanghai',
  interests: 'Photography',
  website: 'https://example.com',
  occupation: 'Designer',
  biography: 'Enjoys making things.',
  diskUsage: '12 MB',
  filesUploaded: '42',
  lastComment: 'Nice image',
  lastUploadedFile: 'sunset.jpg',
};

const loginOutHref = 'logout.php?form_token=token&timestamp=1785225806';

const makeStore = () =>
  configureStore({
    reducer: {
      app: appReducer,
      user: userReducer,
    },
  });

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

const renderPage = (
  mode: 'profile' | 'password',
  store: ReturnType<typeof makeStore>,
  queryClient: QueryClient,
  onBack = jest.fn(),
) =>
  ReactTestRenderer.create(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <UserUpdatePage colors={THEMES.light} mode={mode} onBack={onBack} />
      </Provider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
});

test('submits edited profile values and synchronizes the cached profile', async () => {
  const store = makeStore();
  const queryClient = makeQueryClient();
  const site = store.getState().app.site;
  const queryKey = userProfileQueryKey(site.baseUrl);
  const onBack = jest.fn();
  const apiUpdateUserProfileMock = apiUpdateUserProfile as jest.MockedFunction<
    typeof apiUpdateUserProfile
  >;
  apiUpdateUserProfileMock.mockResolvedValue({
    statusCode: 200,
    data: '<html />',
    success: true,
    message: 'Profile updated.',
    loginOutHref: 'logout.php?form_token=new-token&timestamp=1785225807',
  });
  store.dispatch(userActions.setUserData(user));
  store.dispatch(userActions.setLoginState(loginOutHref));
  queryClient.setQueryData(queryKey, {
    loginRequired: false,
    user,
    loginOutHref,
  });
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderPage('profile', store, queryClient, onBack);
  });

  const inputs = renderer!.root.findAllByType(TextInput);
  ReactTestRenderer.act(() => {
    inputs[0].props.onChangeText('Beijing');
    inputs[1].props.onChangeText('Travel');
    inputs[2].props.onChangeText('https://new.example.com');
    inputs[3].props.onChangeText('Developer');
    inputs[4].props.onChangeText('Updated bio');
  });

  const [submitButton] = renderer!.root.findAllByType(Pressable);
  await ReactTestRenderer.act(async () => {
    await submitButton.props.onPress();
  });

  expect(apiUpdateUserProfileMock).toHaveBeenCalledWith(
    {
      location: 'Beijing',
      interests: 'Travel',
      website: 'https://new.example.com',
      occupation: 'Developer',
      biography: 'Updated bio',
    },
    loginOutHref,
    site,
  );
  expect(store.getState().user).toMatchObject({
    loginOutHref: 'logout.php?form_token=new-token&timestamp=1785225807',
    user: {
      location: 'Beijing',
      interests: 'Travel',
      website: 'https://new.example.com',
      occupation: 'Developer',
      biography: 'Updated bio',
    },
  });
  expect(queryClient.getQueryData(queryKey)).toMatchObject({
    loginOutHref: 'logout.php?form_token=new-token&timestamp=1785225807',
    user: {location: 'Beijing', biography: 'Updated bio'},
  });
  expect(onBack).toHaveBeenCalledTimes(1);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});

test('submits the current password and matching new password', async () => {
  const store = makeStore();
  const queryClient = makeQueryClient();
  const site = store.getState().app.site;
  const onBack = jest.fn();
  const apiUpdateUserPasswordMock = apiUpdateUserPassword as jest.MockedFunction<
    typeof apiUpdateUserPassword
  >;
  apiUpdateUserPasswordMock.mockResolvedValue({
    statusCode: 200,
    data: '<html />',
    success: true,
    message: 'Password updated.',
    loginOutHref: '',
  });
  store.dispatch(userActions.setUserData(user));
  store.dispatch(userActions.setLoginState(loginOutHref));
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderPage('password', store, queryClient, onBack);
  });

  const inputs = renderer!.root.findAllByType(TextInput);
  ReactTestRenderer.act(() => {
    inputs[0].props.onChangeText('old-password');
    inputs[1].props.onChangeText('new-password');
    inputs[2].props.onChangeText('new-password');
  });

  const [submitButton] = renderer!.root.findAllByType(Pressable);
  await ReactTestRenderer.act(async () => {
    await submitButton.props.onPress();
  });

  expect(apiUpdateUserPasswordMock).toHaveBeenCalledWith(
    'old-password',
    'new-password',
    loginOutHref,
    site,
  );
  expect(onBack).toHaveBeenCalledTimes(1);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});
