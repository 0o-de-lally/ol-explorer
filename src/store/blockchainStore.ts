import { observable } from '@legendapp/state';
import { Transaction } from '../types/blockchain';

// Define the store structure
export interface BlockchainStoreType {
  transactions: Transaction[];
  isLoading: boolean;
  blockHeight: number;
  epoch: number;
  chainId: string;
}

// Initialize the store with default values
export const blockchainStore = observable<BlockchainStoreType>({
  transactions: [],
  isLoading: false,
  blockHeight: 0,
  epoch: 0,
  chainId: ''
});

// Store actions for updating state
export const blockchainActions = {
  setStats: (stats: Partial<BlockchainStoreType>) => {
    // Update each property individually
    if (stats.blockHeight !== undefined) {
      blockchainStore.blockHeight.set(stats.blockHeight);
    }
    if (stats.epoch !== undefined) {
      blockchainStore.epoch.set(stats.epoch);
    }
    if (stats.chainId !== undefined) {
      blockchainStore.chainId.set(stats.chainId);
    }
  },
  setTransactions: (transactions: Transaction[]) => {
    blockchainStore.transactions.set(transactions);
  },
  addTransaction: (transaction: Transaction) => {
    // Add to the beginning of the array
    const currentTransactions = blockchainStore.transactions.peek();
    blockchainStore.transactions.set([transaction, ...currentTransactions]);
    
    // Keep only the most recent transactions (limit to 50)
    if (blockchainStore.transactions.length > 50) {
      blockchainStore.transactions.set(
        blockchainStore.transactions.peek().slice(0, 50)
      );
    }
  },
  setLoading: (isLoading: boolean) => {
    blockchainStore.isLoading.set(isLoading);
  }
}; 