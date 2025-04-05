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
  Reanimated.default.call = () => { };
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

// Mock SDK Context and useSdk hook
jest.mock('./src/context/SdkContext', () => ({
  useSdkContext: jest.fn().mockReturnValue({
    sdk: {
      getTransactions: jest.fn().mockResolvedValue([]),
      getBlockByHeight: jest.fn().mockResolvedValue({}),
      getTransaction: jest.fn().mockResolvedValue({}),
      getAccount: jest.fn().mockResolvedValue({}),
      getLedgerInfo: jest.fn().mockResolvedValue({
        chainId: 'test-chain-id',
        epoch: 1,
        blockHeight: 1000,
        ledgerTimestamp: Date.now(),
      }),
      view: jest.fn().mockResolvedValue([]),
    },
    isInitialized: true,
    isInitializing: false,
    error: null,
    isUsingMockData: true,
    initializeSdk: jest.fn(),
    reinitialize: jest.fn(),
  }),
}));

jest.mock('./src/hooks/useSdk', () => ({
  useSdk: jest.fn().mockReturnValue({
    getTransactions: jest.fn().mockResolvedValue([]),
    getBlockByHeight: jest.fn().mockResolvedValue({}),
    getTransaction: jest.fn().mockResolvedValue({}),
    getAccount: jest.fn().mockResolvedValue({}),
    getLedgerInfo: jest.fn().mockResolvedValue({
      chainId: 'test-chain-id',
      epoch: 1,
      blockHeight: 1000,
      ledgerTimestamp: Date.now(),
    }),
    view: jest.fn().mockResolvedValue([]),

    // Extended methods
    ext_getAccountTransactions: jest.fn().mockResolvedValue([]),
    isDonorVoice: jest.fn().mockResolvedValue(false),
    isDonorVoiceAuthorized: jest.fn().mockResolvedValue(false),
    isReauthProposed: jest.fn().mockResolvedValue(false),
    isFounder: jest.fn().mockResolvedValue(false),
    hasFounderFriends: jest.fn().mockResolvedValue(false),
    isVoucherScoreValid: jest.fn().mockResolvedValue(false),
    getVouchScore: jest.fn().mockResolvedValue(0),
    getAllCommunityWallets: jest.fn().mockResolvedValue([]),
    hasEverBeenTouched: jest.fn().mockResolvedValue(false),
    getOnboardingUsecs: jest.fn().mockResolvedValue(0),
    getLastActivityUsecs: jest.fn().mockResolvedValue(0),
    isInitializedOnV8: jest.fn().mockResolvedValue(false),
    getCurrentValidators: jest.fn().mockResolvedValue([]),
    getCurrentBid: jest.fn().mockResolvedValue(0),
    getValidatorGrade: jest.fn().mockResolvedValue({
      isCompliant: false,
      acceptedProposals: 0,
      failedProposals: 0
    }),
    getJailReputation: jest.fn().mockResolvedValue(0),
    getCountBuddiesJailed: jest.fn().mockResolvedValue(0),
    isCommunityWalletInit: jest.fn().mockResolvedValue(false),
    isWithinAuthorizeWindow: jest.fn().mockResolvedValue(false),
    getVetoTally: jest.fn().mockResolvedValue(0),
    getSupplyStats: jest.fn().mockResolvedValue({
      total: 0,
      slowLocked: 0,
      donorVoice: 0,
      pledge: 0,
      unlocked: 0,
    }),
  }),
})); 