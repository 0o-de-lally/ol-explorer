// Import necessary test environment setup
import '@testing-library/jest-native/extend-expect';

// Mock document for React Native Web
document.documentElement = {
  style: {},
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
  },
};

// Mock window for React Native Web
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  document: document,
  innerWidth: 1024,
  innerHeight: 768,
  getComputedStyle: jest.fn(() => ({
    getPropertyValue: jest.fn(() => ''),
  })),
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  requestAnimationFrame: jest.fn(),
  cancelAnimationFrame: jest.fn(),
};

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock Expo constants
jest.mock('expo-constants', () => ({
  manifest: {
    extra: {
      apiUrl: 'https://test-api-url.com',
    },
  },
}));

// Mock the navigation
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    navigate: jest.fn(),
    back: jest.fn(),
    push: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
  Stack: 'Stack',
}));

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock React Native
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.NativeModules.ReanimatedModule = {
    configureProps: jest.fn(),
    createNode: jest.fn(),
    connectNodes: jest.fn(),
    disconnectNodes: jest.fn(),
    updateProps: jest.fn(),
  };
  return rn;
});

// Mock for NativeWind className props
jest.mock('nativewind', () => ({
  styled: (component) => component,
}));

// Mock for react-native-css-interop
jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn().mockImplementation(() => () => ({})),
})); 