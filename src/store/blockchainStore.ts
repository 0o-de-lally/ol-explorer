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
  lastUpdated: number; // Track the time of last update
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
  error: null,
  lastUpdated: Date.now()
});

// Helper to notify UI that store has been updated
const notifyUpdate = () => {
  // Update the lastUpdated timestamp to trigger reactivity
  blockchainStore.lastUpdated.set(Date.now());

  // If we're in a browser environment, dispatch a custom event for components to listen to
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('blockchain-updated', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }
};

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

    // Notify that store has been updated
    notifyUpdate();
  },
  setTransactions: (transactions: Transaction[]) => {
    blockchainStore.transactions.set(transactions);

    // Notify that store has been updated
    notifyUpdate();
  },
  addTransaction: (transaction: Transaction) => {
    // Add to the beginning of the array
    const currentTransactions = blockchainStore.transactions.peek();

    // Check if transaction already exists to avoid duplicates
    const exists = currentTransactions.some(tx => tx.hash === transaction.hash);
    if (exists) {
      return;
    }

    blockchainStore.transactions.set([transaction, ...currentTransactions]);

    // Keep only the most recent transactions (limit to 50)
    if (blockchainStore.transactions.peek().length > 50) {
      blockchainStore.transactions.set(
        blockchainStore.transactions.peek().slice(0, 50)
      );
    }

    // Notify that store has been updated
    notifyUpdate();
  },
  setLoading: (isLoading: boolean) => {
    blockchainStore.isLoading.set(isLoading);

    // If we're no longer loading, notify of update
    if (!isLoading) {
      notifyUpdate();
    }
  },
  setError: (error: string | null) => {
    blockchainStore.error.set(error);

    // Notify that store has been updated
    notifyUpdate();
  },
  forceUpdate: () => {
    // Reset loading state to trigger a UI refresh
    blockchainStore.isLoading.set(true);

    // Clear any existing errors
    blockchainStore.error.set(null);

    // Force all stats to update to trigger reactivity
    // This will tell the reactive system that these values have changed
    // even if they're set to the same values
    const currentStats = blockchainStore.stats.peek();
    blockchainStore.stats.set({
      blockHeight: currentStats.blockHeight,
      epoch: currentStats.epoch,
      chainId: currentStats.chainId
    });

    // Force transactions array to update by creating a new array with the same values
    const currentTransactions = blockchainStore.transactions.peek();
    if (currentTransactions.length > 0) {
      blockchainStore.transactions.set([...currentTransactions]);
    }

    // Update the lastUpdated timestamp to trigger reactivity
    notifyUpdate();

    // After a short delay, update loading state to false
    setTimeout(() => {
      blockchainStore.isLoading.set(false);
      notifyUpdate();
    }, 50);

    // Return true to indicate the update was triggered
    return true;
  }
}; 