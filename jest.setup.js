/* global jest */

global.__DEV__ = true;
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockReact = require('react');

const mockComponent = name =>
  mockReact.forwardRef(({children, ...props}, ref) =>
    mockReact.createElement(name, {...props, ref}, children),
  );

const mockImage = mockComponent('Image');
mockImage.prefetch = jest.fn(() => Promise.resolve(true));

const mockStatusBar = mockComponent('StatusBar');
mockStatusBar.currentHeight = 24;

jest.mock('react-native', () => ({
  ActivityIndicator: mockComponent('ActivityIndicator'),
  Animated: {
    Value: jest.fn(function Value(initialValue) {
      this.value = initialValue;
      this.setValue = jest.fn(value => {
        this.value = value;
      });
      this.interpolate = jest.fn(() => this);
    }),
    add: jest.fn(() => ({setValue: jest.fn()})),
    createAnimatedComponent: jest.fn(component => component),
    event: jest.fn((_mapping, config) => (...args) => {
      config?.listener?.(...args);
    }),
    Text: mockComponent('Animated.Text'),
    View: mockComponent('Animated.View'),
    timing: jest.fn(() => ({
      start: jest.fn(callback => callback && callback()),
    })),
  },
  BackHandler: {
    addEventListener: jest.fn(() => ({remove: jest.fn()})),
    exitApp: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({
      width: 390,
      height: 844,
      scale: 1,
      fontScale: 1,
    })),
    addEventListener: jest.fn(() => ({remove: jest.fn()})),
  },
  I18nManager: {
    getConstants: jest.fn(() => ({isRTL: false})),
    isRTL: false,
  },
  Image: mockImage,
  Linking: {
    addEventListener: jest.fn(() => ({remove: jest.fn()})),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    openURL: jest.fn(() => Promise.resolve()),
    removeEventListener: jest.fn(),
  },
  PanResponder: {
    create: jest.fn(handlers => ({panHandlers: handlers})),
  },
  Platform: {
    OS: 'ios',
    Version: 17,
    constants: {reactNativeVersion: {major: 0, minor: 86, patch: 0}},
    isPad: false,
    isTV: false,
    select: jest.fn(options => options.ios ?? options.default),
  },
  Pressable: mockComponent('Pressable'),
  ScrollView: mockComponent('ScrollView'),
  StatusBar: mockStatusBar,
  StyleSheet: {
    absoluteFill: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    create: styles => styles,
    flatten: style => {
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.filter(Boolean));
      }
      return style ?? {};
    },
    hairlineWidth: 1,
  },
  Switch: mockComponent('Switch'),
  Text: mockComponent('Text'),
  TextInput: mockComponent('TextInput'),
  UIManager: {
    getViewManagerConfig: jest.fn(() => null),
  },
  View: mockComponent('View'),
  findNodeHandle: jest.fn(() => 1),
  useAnimatedValue: jest.fn(initialValue => ({
    setValue: jest.fn(),
    value: initialValue,
  })),
  useWindowDimensions: jest.fn(() => ({width: 390, height: 844})),
}));

jest.mock('react-native-screens', () => ({
  FullWindowOverlay: mockComponent('FullWindowOverlay'),
  Screen: mockComponent('Screen'),
  ScreenContainer: mockComponent('ScreenContainer'),
  ScreenFooter: mockComponent('ScreenFooter'),
  ScreenStack: mockComponent('ScreenStack'),
  ScreenStackHeaderBackButtonImage: mockComponent(
    'ScreenStackHeaderBackButtonImage',
  ),
  ScreenStackHeaderCenterView: mockComponent('ScreenStackHeaderCenterView'),
  ScreenStackHeaderConfig: mockComponent('ScreenStackHeaderConfig'),
  ScreenStackHeaderLeftView: mockComponent('ScreenStackHeaderLeftView'),
  ScreenStackHeaderRightView: mockComponent('ScreenStackHeaderRightView'),
  ScreenStackHeaderSearchBarView: mockComponent(
    'ScreenStackHeaderSearchBarView',
  ),
  ScreenStackItem: mockComponent('ScreenStackItem'),
  SearchBar: mockComponent('SearchBar'),
  compatibilityFlags: {},
  enableScreens: jest.fn(),
  isHeaderBarButtonsAvailableForCurrentPlatform: false,
  isSearchBarAvailableForCurrentPlatform: false,
  screensEnabled: jest.fn(() => true),
}));

jest.mock('react-native/Libraries/Components/View/ReactNativeStyleAttributes', () => ({
  fontFamily: {process: jest.fn(value => value)},
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaFrameContext: mockReact.createContext({
    x: 0,
    y: 0,
    width: 390,
    height: 844,
  }),
  SafeAreaInsetsContext: mockReact.createContext({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
  SafeAreaProvider: mockComponent('SafeAreaProvider'),
  SafeAreaView: mockComponent('SafeAreaView'),
  initialWindowMetrics: {
    frame: {x: 0, y: 0, width: 390, height: 844},
    insets: {top: 0, right: 0, bottom: 0, left: 0},
  },
  useSafeAreaFrame: jest.fn(() => ({x: 0, y: 0, width: 390, height: 844})),
  useSafeAreaInsets: jest.fn(() => ({top: 0, right: 0, bottom: 0, left: 0})),
}));
