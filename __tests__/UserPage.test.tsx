import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Pressable, ScrollView, Text} from 'react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {UserPage} from '../src/pages/UserPage';
import {fetchUserProfile, type UserProfilePageData} from '../src/query/fetchers';
import {clearAuthorizationCookies} from '../src/storage/authorization';
import {appReducer} from '../src/store/appSlice';
import {userActions, userReducer} from '../src/store/user';
import {THEMES} from '../src/tools/theme';

jest.mock('../src/query/fetchers', () => ({
  fetchUserProfile: jest.fn(),
}));

jest.mock('../src/component/AppHeader', () => ({
  AppHeader: () => null,
}));

jest.mock('../src/component/LoadingState', () => ({
  LoadingState: () => null,
}));

jest.mock('../src/storage/authorization', () => ({
  clearAuthorizationCookies: jest.fn(),
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

const profileData: UserProfilePageData = {
  loginRequired: false,
  user,
  loginOutHref: 'logout.php?form_token=token',
};

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
        staleTime: Infinity,
      },
    },
  });

const renderUserPage = (
  store: ReturnType<typeof makeStore>,
  queryClient: QueryClient,
  onLogin = jest.fn(),
  onUpdate = jest.fn(),
) =>
  ReactTestRenderer.create(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <UserPage
          colors={THEMES.light}
          onBack={jest.fn()}
          onLogin={onLogin}
          onUpdate={onUpdate}
        />
      </Provider>
    </QueryClientProvider>,
  );

const fetchUserProfileMock = fetchUserProfile as jest.MockedFunction<
  typeof fetchUserProfile
>;
const clearCookiesMock = clearAuthorizationCookies as jest.MockedFunction<
  typeof clearAuthorizationCookies
>;

const textValues = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .filter(value => typeof value === 'string');

beforeEach(() => {
  jest.clearAllMocks();
});

test('loads and synchronizes the profile, then supports manual refresh', async () => {
  fetchUserProfileMock
    .mockResolvedValueOnce(profileData)
    .mockResolvedValueOnce({
      ...profileData,
      user: {...profileData.user, biography: 'Updated biography.'},
    });
  const store = makeStore();
  const queryClient = makeQueryClient();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderUserPage(store, queryClient);
  });
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 20));
  });

  const site = store.getState().app.site;
  expect(fetchUserProfileMock).toHaveBeenCalledWith(site, expect.anything());
  expect(textValues(renderer!)).toEqual(
    expect.arrayContaining(['alice', 'Active', 'Enjoys making things.']),
  );
  expect(store.getState().user).toMatchObject({
    loggedIn: true,
    loginOutHref: profileData.loginOutHref,
    user,
  });

  const scrollView = renderer!.root.findByType(ScrollView);
  const refreshControl = scrollView.props.refreshControl as React.ReactElement<{
    onRefresh: () => Promise<unknown>;
  }>;
  await ReactTestRenderer.act(async () => {
    await refreshControl.props.onRefresh();
  });
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 20));
  });

  expect(fetchUserProfileMock).toHaveBeenCalledTimes(2);
  expect(textValues(renderer!)).toContain('Updated biography.');

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});

test('clears stale auth data and offers login when the server rejects the session', async () => {
  fetchUserProfileMock.mockResolvedValue({loginRequired: true});
  const store = makeStore();
  const queryClient = makeQueryClient();
  store.dispatch(userActions.setUserData(user));
  store.dispatch(userActions.setLoginState(profileData.loginOutHref));
  const onLogin = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderUserPage(store, queryClient, onLogin);
  });
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 20));
  });

  expect(clearCookiesMock).toHaveBeenCalledTimes(1);
  expect(store.getState().user).toMatchObject({
    loggedIn: false,
    loginOutHref: '',
    user: {username: ''},
  });

  const [loginButton] = renderer!.root.findAllByType(Pressable);
  await ReactTestRenderer.act(async () => {
    loginButton.props.onPress();
  });
  expect(onLogin).toHaveBeenCalledTimes(1);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});

test('shows a retry action after a profile request fails', async () => {
  fetchUserProfileMock
    .mockRejectedValueOnce(new Error('network unavailable'))
    .mockResolvedValueOnce(profileData);
  const store = makeStore();
  const queryClient = makeQueryClient();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderUserPage(store, queryClient);
  });
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 20));
  });

  const [retryButton] = renderer!.root.findAllByType(Pressable);
  await ReactTestRenderer.act(async () => {
    await retryButton.props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 20));
  });

  expect(fetchUserProfileMock).toHaveBeenCalledTimes(2);
  expect(textValues(renderer!)).toContain('alice');

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});

test('opens the requested update form from the profile actions', async () => {
  fetchUserProfileMock.mockResolvedValue(profileData);
  const store = makeStore();
  const queryClient = makeQueryClient();
  const onUpdate = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderUserPage(store, queryClient, jest.fn(), onUpdate);
  });
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 20));
  });

  const profileButton = renderer!.root.findByProps({accessibilityLabel: '修改信息'});
  const passwordButton = renderer!.root.findByProps({accessibilityLabel: '修改密码'});
  ReactTestRenderer.act(() => {
    profileButton.props.onPress();
    passwordButton.props.onPress();
  });

  expect(onUpdate).toHaveBeenNthCalledWith(1, 'profile');
  expect(onUpdate).toHaveBeenNthCalledWith(2, 'password');

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});
