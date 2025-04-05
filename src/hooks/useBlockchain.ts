import {useState, useCallback, useEffect} from 'react';
import {blockchainStore, blockchainActions} from '../store/blockchainStore';
import {useSdk} from './useSdk';
import {useSdkContext} from '../context/SdkContext';
import appConfig from '../config/appConfig';

export const useBlockchain = () => {
  const [isLoading, setIsLoading] = useState(false);
  const sdk = useSdk();
  const { isInitialized, isInitializing } = useSdkContext();

  // Use this flag to avoid duplicate fetches
  const [fetchRequested, setFetchRequested] = useState(false);

  const refreshData = useCallback(async () => {
    if (!isInitialized) {
      console.log('SDK not initialized yet, waiting before refreshing data');
      return;
    }

    // Avoid duplicate fetch requests
    if (isLoading || fetchRequested) {
      console.log('Data refresh already in progress, skipping duplicate request');
      return;
    }

    setIsLoading(true);
    setFetchRequested(true);

    // Use blockchain store's loading state as well to ensure components know we're loading
    blockchainActions.setLoading(true);

    try {
      console.log('Refreshing blockchain data...');

      // Get the current transaction limit from the store (or use default if not set)
      const currentTransactionLimit = blockchainStore.currentLimit?.get() || appConfig.transactions.defaultLimit;
      
      console.log(`Using current transaction limit for refresh: ${currentTransactionLimit}`);
      
      // Fetch latest transactions using the current limit from the store
      const transactions = await sdk.getTransactions(currentTransactionLimit);
      console.log(`Fetched ${transactions.length} transactions with limit ${currentTransactionLimit}`);

      // Update transaction list in store
      blockchainActions.setTransactions(transactions);

      // Update blockchain info
      const [blockHeight, epoch, chainId] = await Promise.all([
        sdk.getLatestBlockHeight(),
        sdk.getLatestEpoch(),
        sdk.getChainId()
      ]);

      console.log('Fetched blockchain stats:', { blockHeight, epoch, chainId });

      // Use the blockchainActions to update store values
      blockchainActions.setStats({
        blockHeight,
        epoch,
        chainId
      });

      // Force an update to ensure state changes propagate
      blockchainActions.forceUpdate();
    } catch (error) {
      console.error('Error refreshing blockchain data:', error);
      blockchainActions.setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
      setFetchRequested(false);
      blockchainActions.setLoading(false);
    }
  }, [sdk, isInitialized, isLoading, fetchRequested]);

  // Auto-refresh when SDK becomes initialized
  useEffect(() => {
    if (isInitialized && !isInitializing) {
      console.log('SDK initialized, automatically refreshing blockchain data');
      refreshData();
    }
  }, [isInitialized, isInitializing]);

  // Set up periodic refresh
  useEffect(() => {
    if (isInitialized) {
      console.log('Setting up periodic refresh for blockchain data');
      const refreshInterval = setInterval(() => {
        refreshData();
      }, 30000); // Refresh every 30 seconds

      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [isInitialized]);

  return {
    refreshData,
    isLoading,
    isInitialized,
    isInitializing
  };
}; 