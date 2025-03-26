import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../../screens/HomeScreen';
import { useSdk } from '../../hooks/useSdk';
import { blockchainActions } from '../../store/blockchainStore';

// Mock the SDK
jest.mock('../../hooks/useSdk', () => ({
  useSdk: jest.fn(),
}));

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
  });
  
  return {
    blockchainStore: store,
    blockchainActions: {
      setStats: jest.fn(),
      setTransactions: jest.fn(),
      addTransaction: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
    },
  };
});

// Mock the components
jest.mock('../../components/BlockchainStats', () => ({
  BlockchainStats: () => 'BlockchainStats',
}));

jest.mock('../../components/TransactionsList', () => ({
  TransactionsList: () => 'TransactionsList',
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
      },
    ]),
    getTransaction: jest.fn(),
    getAccount: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSdk as jest.Mock).mockReturnValue(mockSdk);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches initial data on mount', async () => {
    render(<HomeScreen />);
    
    // Initial data fetch
    await waitFor(() => {
      expect(mockSdk.getLatestBlockHeight).toHaveBeenCalledTimes(1);
      expect(mockSdk.getLatestEpoch).toHaveBeenCalledTimes(1);
      expect(mockSdk.getChainId).toHaveBeenCalledTimes(1);
      expect(mockSdk.getTransactions).toHaveBeenCalledWith(20);
      
      expect(blockchainActions.setStats).toHaveBeenCalledWith({
        blockHeight: 12345678,
        epoch: 123,
        chainId: 'testnet',
      });
      expect(blockchainActions.setTransactions).toHaveBeenCalled();
      expect(blockchainActions.setLoading).toHaveBeenCalledWith(true);
      expect(blockchainActions.setLoading).toHaveBeenCalledWith(false);
    });
  });

  it('sets up polling for updates', async () => {
    render(<HomeScreen />);
    
    // Wait for initial fetch
    await waitFor(() => {
      expect(mockSdk.getLatestBlockHeight).toHaveBeenCalledTimes(1);
    });
    
    // Reset mock counts
    jest.clearAllMocks();
    
    // Advance timers to trigger polling
    jest.advanceTimersByTime(10000);
    
    // Check that polling fetch was called
    await waitFor(() => {
      expect(mockSdk.getLatestBlockHeight).toHaveBeenCalledTimes(1);
      expect(mockSdk.getTransactions).toHaveBeenCalledWith(5);
    });
  });

  it('cleans up polling on unmount', async () => {
    const { unmount } = render(<HomeScreen />);
    
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    // Unmount the component
    unmount();
    
    // Check that clearInterval was called
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
}); 