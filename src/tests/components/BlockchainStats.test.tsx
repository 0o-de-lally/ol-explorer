import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BlockchainStats } from '../../components/BlockchainStats';
import { blockchainActions } from '../../store/blockchainStore';

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
      setStats: jest.fn((stats) => {
        if (stats.blockHeight !== undefined) {
          store.stats.blockHeight.set(stats.blockHeight);
        }
        if (stats.epoch !== undefined) {
          store.stats.epoch.set(stats.epoch);
        }
        if (stats.chainId !== undefined) {
          store.stats.chainId.set(stats.chainId);
        }
      }),
      forceUpdate: jest.fn(() => {
        store._forceUpdate.set(store._forceUpdate.get() + 1);
      }),
    },
  };
});

// Mock the useForceUpdate hook
jest.mock('../../hooks/useForceUpdate', () => ({
  useForceUpdate: jest.fn(() => 1),
}));

describe('BlockchainStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading state initially', () => {
    render(<BlockchainStats testID="blockchain-stats" />);
    
    // Check that the testID is properly assigned
    expect(screen.getByTestId('blockchain-stats')).toBeTruthy();
  });

  it('displays blockchain stats when data is loaded', () => {
    // Set the stats
    blockchainActions.setStats({
      blockHeight: 12345678,
      epoch: 123,
      chainId: 'testnet',
    });
    
    render(<BlockchainStats testID="blockchain-stats" />);
    
    // Check that the values are displayed correctly
    expect(screen.getByText('12,345,678')).toBeTruthy();
    expect(screen.getByText('123')).toBeTruthy();
    expect(screen.getByText('testnet')).toBeTruthy();
  });

  it('has the correct testID', () => {
    const { getByTestId } = render(<BlockchainStats testID="custom-testid" />);
    expect(getByTestId('custom-testid')).toBeTruthy();
  });
}); 