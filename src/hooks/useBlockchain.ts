import { useState, useCallback } from 'react';
import { blockchainStore } from '../store/blockchainStore';
import { useSdk } from './useSdk';

export const useBlockchain = () => {
  const [isLoading, setIsLoading] = useState(false);
  const sdk = useSdk();

  const refreshData = useCallback(async () => {
    if (!sdk.isInitialized) return;
    
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

      blockchainStore.blockHeight.set(blockHeight);
      blockchainStore.epoch.set(epoch);
      blockchainStore.chainId.set(chainId);
    } catch (error) {
      console.error('Error refreshing blockchain data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  return {
    refreshData,
    isLoading
  };
}; 