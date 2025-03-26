import { useState, useCallback, useEffect } from 'react';
import { blockchainStore, blockchainActions } from '../store/blockchainStore';
import { useSdk } from './useSdk';
import { useSdkContext } from '../context/SdkContext';

export const useBlockchain = () => {
  const [isLoading, setIsLoading] = useState(false);
  const sdk = useSdk();
  const { isInitialized, isInitializing } = useSdkContext();

  const refreshData = useCallback(async () => {
    if (!isInitialized) {
      console.log('SDK not initialized yet, waiting before refreshing data');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch latest transactions
      const transactions = await sdk.getTransactions(25);
      blockchainStore.transactions.set(transactions);

      // Update blockchain info
      const [blockHeight, epoch, chainId] = await Promise.all([
        sdk.getLatestBlockHeight(),
        sdk.getLatestEpoch(),
        sdk.getChainId()
      ]);

      // Use the blockchainActions to update store values
      blockchainActions.setStats({
        blockHeight,
        epoch,
        chainId
      });
    } catch (error) {
      console.error('Error refreshing blockchain data:', error);
      blockchainActions.setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isInitialized]);

  // Auto-refresh when SDK becomes initialized
  useEffect(() => {
    if (isInitialized && !isInitializing) {
      console.log('SDK initialized, automatically refreshing blockchain data');
      refreshData();
    }
  }, [isInitialized, isInitializing]);

  return {
    refreshData,
    isLoading,
    isInitialized,
    isInitializing
  };
}; 