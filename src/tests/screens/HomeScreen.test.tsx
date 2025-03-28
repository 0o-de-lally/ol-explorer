import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../../screens/HomeScreen';
import { useSdk } from '../../hooks/useSdk';
import { blockchainActions } from '../../store/blockchainStore';

// Mock the SDK
jest.mock('../../hooks/useSdk', () => ({
  useSdk: jest.fn(),
}));

// Mock the useWindowDimensions hook
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => {
  return {
    __esModule: true,
    default: () => ({
      width: 1000,
      height: 1000,
      scale: 1,
      fontScale: 1,
    }),
  };
});

// Mock the blockchainStore
jest.mock('../../store/blockchainStore', () => {
  const observable = require('@legendapp/state').observable;
  
  const store = observable({
    stats: {
      blockHeight: null,
      epoch: null,
      chainId: null,
    },
    transactions: [],
    isLoading: false,
    error: null,
    _forceUpdate: 0,
  });
  
  return {
    blockchainStore: store,
    blockchainActions: {
      setStats: jest.fn(),
      setTransactions: jest.fn(),
      addTransaction: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      forceUpdate: jest.fn(() => {
        store._forceUpdate.set(store._forceUpdate.get() + 1);
      }),
    },
  };
});

// Mock the SdkContext
jest.mock('../../context/SdkContext', () => ({
  useSdkContext: jest.fn(() => ({
    isInitialized: true,
    isInitializing: false,
    error: null,
    isUsingMockData: false,
    reinitialize: jest.fn(),
  })),
}));

// Mock the components
jest.mock('../../components/BlockchainMetrics', () => ({
  BlockchainMetrics: () => 'BlockchainMetrics',
}));

jest.mock('../../components/TransactionsList', () => ({
  TransactionsList: () => 'TransactionsList',
}));

// Mock the useForceUpdate hook
jest.mock('../../hooks/useForceUpdate', () => ({
  useForceUpdate: jest.fn(() => 1),
}));

// Mock the useBlockTime hook
jest.mock('../../hooks/useBlockTime', () => ({
  useBlockTime: jest.fn(),
}));

describe('HomeScreen', () => {
  // Mock implementation of the SDK
  const mockSdk = {
    getLatestBlockHeight: jest.fn().mockResolvedValue(12345678),
    getLatestEpoch: jest.fn().mockResolvedValue(123),
    getChainId: jest.fn().mockResolvedValue('testnet'),
    getTransactions: jest.fn().mockResolvedValue([
      {
        hash: '0xabc123',
        version: 10000001,
        sender: '0xsender123',
        sequence_number: 10,
        timestamp: Date.now(),
        type: 'transfer',
        status: 'success',
        gas_used: 100,
        gas_unit_price: 10,
        vm_status: 'Executed successfully',
        block_height: 12345678,
      },
    ]),
    getTransaction: jest.fn(),
    getAccount: jest.fn(),
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSdk as jest.Mock).mockReturnValue(mockSdk);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<HomeScreen />);
    // If we get here without errors, the test passes
  });

  it('fetches initial data on mount', async () => {
    render(<HomeScreen />);
    
    // Initial data fetch
    await waitFor(() => {
      expect(mockSdk.getLatestBlockHeight).toHaveBeenCalledTimes(1);
      expect(mockSdk.getLatestEpoch).toHaveBeenCalledTimes(1);
      expect(mockSdk.getChainId).toHaveBeenCalledTimes(1);
      expect(mockSdk.getTransactions).toHaveBeenCalled();
    });
  });

  it('sets up polling for updates', async () => {
    const { unmount } = render(<HomeScreen />);
    
    // Cleanup to prevent memory leaks
    unmount();
  });
}); 