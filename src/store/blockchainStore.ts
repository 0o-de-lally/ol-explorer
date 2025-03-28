import { observable } from '@legendapp/state';
import { Transaction } from '../types/blockchain';
import appConfig from '../config/appConfig';

// Define the store structure
export interface BlockchainStoreType {
  transactions: Transaction[];
  isLoading: boolean;
  isMetricsLoading: boolean; // Separate loading state for metrics
  stats: {
    blockHeight: number | null;
    epoch: number | null;
    chainId: string | null;
  };
  error: string | null;
  lastUpdated: number; // Track the time of last update
  lastMetricsUpdated: number; // Separate update tracking for metrics
  lastTransactionsUpdated: number; // Separate update tracking for transactions
  currentLimit: number; // Track the current transaction limit
}

// Initialize the store with default values
export const blockchainStore = observable<BlockchainStoreType>({
  transactions: [],
  isLoading: false,
  isMetricsLoading: false,
  stats: {
    blockHeight: null,
    epoch: null,
    chainId: null
  },
  error: null,
  lastUpdated: Date.now(),
  lastMetricsUpdated: Date.now(),
  lastTransactionsUpdated: Date.now(),
  currentLimit: appConfig.transactions.defaultLimit // Default to config value
});

// Helper to notify UI that store has been updated
const notifyUpdate = (updateType: 'all' | 'metrics' | 'transactions' = 'all') => {
  const now = Date.now();
  
  // Update the appropriate timestamps
  if (updateType === 'all' || updateType === 'metrics') {
    blockchainStore.lastMetricsUpdated.set(now);
  }
  
  if (updateType === 'all' || updateType === 'transactions') {
    blockchainStore.lastTransactionsUpdated.set(now);
  }
  
  // Always update the global timestamp
  blockchainStore.lastUpdated.set(now);

  // If we're in a browser environment, dispatch a custom event for components to listen to
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('blockchain-updated', {
      detail: { 
        timestamp: now,
        updateType: updateType
      }
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

    // Notify that metrics have been updated
    notifyUpdate('metrics');
  },
  setTransactions: (transactions: Transaction[]) => {
    blockchainStore.transactions.set(transactions);

    // Notify that transactions have been updated
    notifyUpdate('transactions');
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

    // Notify that transactions have been updated
    notifyUpdate('transactions');
  },
  setLoading: (isLoading: boolean) => {
    blockchainStore.isLoading.set(isLoading);

    // If we're no longer loading, notify of transaction update
    if (!isLoading) {
      notifyUpdate('transactions');
    }
  },
  setMetricsLoading: (isLoading: boolean) => {
    blockchainStore.isMetricsLoading.set(isLoading);

    // If we're no longer loading, notify of metrics update
    if (!isLoading) {
      notifyUpdate('metrics');
    }
  },
  setError: (error: string | null) => {
    blockchainStore.error.set(error);

    // Notify that store has been updated
    notifyUpdate('all');
  },
  forceUpdate: () => {
    // Reset loading state to trigger a UI refresh
    blockchainStore.isLoading.set(true);
    blockchainStore.isMetricsLoading.set(true);

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
    notifyUpdate('all');

    // After a short delay, update loading state to false
    setTimeout(() => {
      blockchainStore.isLoading.set(false);
      blockchainStore.isMetricsLoading.set(false);
      notifyUpdate('all');
    }, 50);

    // Return true to indicate the update was triggered
    return true;
  },
  // Force update only transactions
  forceUpdateTransactions: () => {
    // Reset loading state to trigger a UI refresh
    blockchainStore.isLoading.set(true);

    // Force transactions array to update by creating a new array with the same values
    const currentTransactions = blockchainStore.transactions.peek();
    if (currentTransactions.length > 0) {
      blockchainStore.transactions.set([...currentTransactions]);
    }

    // Update the lastUpdated timestamp to trigger reactivity
    notifyUpdate('transactions');

    // After a short delay, update loading state to false
    setTimeout(() => {
      blockchainStore.isLoading.set(false);
      notifyUpdate('transactions');
    }, 50);

    return true;
  },
  // Force update only metrics
  forceUpdateMetrics: () => {
    // Reset loading state for metrics to trigger a UI refresh
    blockchainStore.isMetricsLoading.set(true);

    // Force all stats to update to trigger reactivity
    const currentStats = blockchainStore.stats.peek();
    blockchainStore.stats.set({
      blockHeight: currentStats.blockHeight,
      epoch: currentStats.epoch,
      chainId: currentStats.chainId
    });

    // Update the lastUpdated timestamp to trigger reactivity
    notifyUpdate('metrics');

    // After a short delay, update loading state to false
    setTimeout(() => {
      blockchainStore.isMetricsLoading.set(false);
      notifyUpdate('metrics');
    }, 50);

    return true;
  },
  setCurrentLimit: (limit: number) => {
    blockchainStore.currentLimit.set(limit);
    
    // Notify that transactions settings have been updated
    notifyUpdate('transactions');
  }
}; 