import React, {useEffect, useMemo, useState} from 'react';
import {
  CommonActions,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';
import {StatusBar, StyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider as ReduxProvider} from 'react-redux';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {SideMenu} from './src/component/SideMenu';
import {ToastHost} from './src/component/Toast';
import {FavoritesPage} from './src/pages/FavoritesPage';
import {ImageDetailPage} from './src/pages/ImageDetailPage';
import {IndexPage} from './src/pages/IndexPage';
import {LoginPage} from './src/pages/LoginPage';
import {SearchPage} from './src/pages/SearchPage';
import {SearchResultPage} from './src/pages/SearchResultPage';
import {SettingPage} from './src/pages/SettingPage';
import {UserPage} from './src/pages/UserPage';
import {clearExpiredAuthorizationCookies} from './src/storage/authorization';
import {queryClient} from './src/query/client';
import {appActions, store, userActions} from './src/store';
import {useAppDispatch, useAppSelector} from './src/store/hooks';
import {getTheme} from './src/tools/theme';
import type {GalleryImage, SearchConfig} from './src/tools/types';

type RootStackParamList = {
  home: undefined;
  favorites: undefined;
  login: undefined;
  settings: undefined;
  user: undefined;
  search: undefined;
  searchResult: {config: SearchConfig};
  imageDetail: {image: GalleryImage};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <QueryClientProvider client={queryClient}>
            <AppShell />
          </QueryClientProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.app.theme);
  const colors = useMemo(() => getTheme(theme), [theme]);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (clearExpiredAuthorizationCookies()) {
      dispatch(userActions.clearUserData());
    }
    // 加载本地用户数据到内存 如果后续其他页面要用再补充加载
  }, [dispatch]);

  const navigationTheme = useMemo(() => {
    const baseTheme = theme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: colors.background,
        border: colors.border,
        card: colors.surface,
        notification: colors.accent,
        primary: colors.primary,
        text: colors.text,
      },
    };
  }, [colors, theme]);

  const goHome = () => {
    dispatch(appActions.selectAlbum(null));
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'home'}],
        }),
      );
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      <View style={styles.container}>
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          documentTitle={{enabled: false}}>
          <Stack.Navigator
            initialRouteName="home"
            screenOptions={{
              headerShown: false,
              contentStyle: {backgroundColor: colors.background},
            }}>
            <Stack.Screen name="home">
              {({navigation}) => (
                <IndexPage
                  colors={colors}
                  onMenu={() => setMenuOpen(true)}
                  onSearch={() => navigation.navigate('search')}
                  onOpenImage={image =>
                    navigation.navigate('imageDetail', {image})
                  }
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="favorites">
              {({navigation}) => (
                <FavoritesPage
                  colors={colors}
                  onBack={() => navigation.goBack()}
                  onOpenImage={image =>
                    navigation.navigate('imageDetail', {image})
                  }
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="settings">
              {({navigation}) => (
                <SettingPage
                  colors={colors}
                  onBack={() => navigation.goBack()}
                  onLogin={() => navigation.navigate('login')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="user">
              {({navigation}) => (
                <UserPage
                  colors={colors}
                  onBack={() => navigation.goBack()}
                  onLogin={() => navigation.navigate('login')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="login">
              {({navigation}) => (
                <LoginPage
                  colors={colors}
                  onBack={() => navigation.goBack()}
                  onSuccess={() =>
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{name: 'home'}],
                      }),
                    )
                  }
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="search">
              {({navigation}) => (
                <SearchPage
                  colors={colors}
                  onBack={() => navigation.goBack()}
                  onSearch={config =>
                    navigation.navigate('searchResult', {config})
                  }
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="searchResult">
              {({navigation, route}) => (
                <SearchResultPage
                  colors={colors}
                  config={route.params.config}
                  onBack={() => navigation.goBack()}
                  onOpenImage={image =>
                    navigation.navigate('imageDetail', {image})
                  }
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="imageDetail">
              {({navigation, route}) => (
                <ImageDetailPage
                  colors={colors}
                  image={route.params.image}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </View>
      <SideMenu
        open={menuOpen}
        colors={colors}
        onClose={() => setMenuOpen(false)}
        onHome={goHome}
        onFavorites={() => {
          dispatch(appActions.selectAlbum(null));
          navigationRef.navigate('favorites');
        }}
        onSettings={() => navigationRef.navigate('settings')}
        onUser={() => navigationRef.navigate('user')}
      />
      <ToastHost colors={colors} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});

export default App;
