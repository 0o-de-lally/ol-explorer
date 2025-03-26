import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BlockchainStats } from '../../components/BlockchainStats';
import { blockchainActions } from '../../store/blockchainStore';

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
    },
  };
});

describe('BlockchainStats', () => {
  it('displays loading state initially', () => {
    render(<BlockchainStats testID="blockchain-stats" />);
    
    // Get all loading text elements
    const loadingElements = screen.getAllByText('Loading...');
    
    // There should be 3 of them (block height, epoch, chain id)
    expect(loadingElements.length).toBe(3);
  });

  it('displays blockchain stats when data is loaded', () => {
    // Set the stats
    blockchainActions.setStats({
      blockHeight: 12345678,
      epoch: 123,
      chainId: 'testnet',
    });
    
    render(<BlockchainStats testID="blockchain-stats" />);
    
    expect(screen.getByText('12345678')).toBeTruthy();
    expect(screen.getByText('123')).toBeTruthy();
    expect(screen.getByText('testnet')).toBeTruthy();
  });

  it('has the correct testID', () => {
    const { getByTestId } = render(<BlockchainStats testID="custom-testid" />);
    expect(getByTestId('custom-testid')).toBeTruthy();
  });
}); 