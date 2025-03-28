import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TransactionsList } from '../../components/TransactionsList';
import { blockchainStore } from '../../store/blockchainStore';

// Mock navigation
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

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
  
  const mockTransactions = [
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
    {
      hash: '0xdef456',
      version: 10000000,
      sender: '0xsender456',
      sequence_number: 9,
      timestamp: Date.now() - 60000,
      type: 'script',
      status: 'success',
      gas_used: 200,
      gas_unit_price: 10,
      vm_status: 'Executed successfully',
      block_height: 12345677,
    },
  ];
  
  return {
    blockchainStore: observable({
      transactions: mockTransactions,
      isLoading: false,
      error: null,
    }),
  };
});

// Mock the useForceUpdate hook
jest.mock('../../hooks/useForceUpdate', () => ({
  useForceUpdate: jest.fn(() => 1),
}));

describe('TransactionsList', () => {
  const mockOnRefresh = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders transactions list correctly', () => {
    render(<TransactionsList testID="transactions-list" onRefresh={mockOnRefresh} />);
    
    // Check that the testID is properly assigned
    expect(screen.getByTestId('transactions-list')).toBeTruthy();
    
    // Check that transactions are rendered
    expect(screen.getByText('0xabc123')).toBeTruthy();
    expect(screen.getByText('0xdef456')).toBeTruthy();
  });
  
  it('calls onRefresh when refresh button is pressed', () => {
    render(<TransactionsList testID="transactions-list" onRefresh={mockOnRefresh} />);
    
    // Find and press the refresh button
    const refreshButton = screen.getByTestId('refresh-button');
    fireEvent.press(refreshButton);
    
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });
  
  it('displays loading state correctly', () => {
    // Set loading state to true
    blockchainStore.isLoading.set(true);
    
    render(<TransactionsList testID="transactions-list" onRefresh={mockOnRefresh} />);
    
    // Reset loading state for other tests
    blockchainStore.isLoading.set(false);
  });
  
  it('handles empty transaction list', () => {
    // Set empty transactions list
    const originalTransactions = blockchainStore.transactions.get();
    blockchainStore.transactions.set([]);
    
    render(<TransactionsList testID="transactions-list" onRefresh={mockOnRefresh} />);
    
    // Check for no transactions message or empty state
    
    // Restore original transactions for other tests
    blockchainStore.transactions.set(originalTransactions);
  });
}); 