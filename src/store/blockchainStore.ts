import { observable } from '@legendapp/state';
import { Transaction } from '../types/blockchain';

// Define the store structure
export interface BlockchainStoreType {
  transactions: Transaction[];
  isLoading: boolean;
  stats: {
    blockHeight: number | null;
    epoch: number | null;
    chainId: string | null;
  };
  error: string | null;
}

// Initialize the store with default values
export const blockchainStore = observable<BlockchainStoreType>({
  transactions: [],
  isLoading: false,
  stats: {
    blockHeight: null,
    epoch: null,
    chainId: null
  },
  error: null
});

// Store actions for updating state
export const blockchainActions = {
  setStats: (stats: Partial<{
    blockHeight: number;
    epoch: number;
    chainId: string;
  }>) => {
    // Update each property individually
    if (stats.blockHeight !== undefined) {
      blockchainStore.stats.blockHeight.set(stats.blockHeight);
    }
    if (stats.epoch !== undefined) {
      blockchainStore.stats.epoch.set(stats.epoch);
    }
    if (stats.chainId !== undefined) {
      blockchainStore.stats.chainId.set(stats.chainId);
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
    if (blockchainStore.transactions.peek().length > 50) {
      blockchainStore.transactions.set(
        blockchainStore.transactions.peek().slice(0, 50)
      );
    }
  },
  setLoading: (isLoading: boolean) => {
    blockchainStore.isLoading.set(isLoading);
  },
  setError: (error: string | null) => {
    blockchainStore.error.set(error);
  }
}; 