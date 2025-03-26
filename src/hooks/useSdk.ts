import { useCallback } from 'react';
import { BlockchainSDK } from '../types/blockchain';
import { useSdkContext } from '../context/SdkContext';

/**
 * Hook for accessing the SDK instance.
 * This is now a thin wrapper over the SDK context.
 */
export const useSdk = (): BlockchainSDK => {
  const { sdk, isInitialized, isInitializing, error, reinitialize } = useSdkContext();

  // If SDK is not initialized yet, return a stub that indicates that state
  if (!sdk) {
    return {
      getLatestBlockHeight: async () => { console.log('SDK not initialized, returning placeholder block height'); return 0; },
      getLatestEpoch: async () => { console.log('SDK not initialized, returning placeholder epoch'); return 0; },
      getChainId: async () => { console.log('SDK not initialized, returning placeholder chain ID'); return '0'; },
      getTransactions: async () => { console.log('SDK not initialized, returning empty transactions'); return []; },
      getTransactionByHash: async () => { console.log('SDK not initialized, returning null transaction'); return null; },
      getAccount: async () => { console.log('SDK not initialized, returning null account'); return null; },
      isInitialized: false,
      error: error || new Error('SDK not initialized')
    };
  }

  // Return the actual SDK
  return {
    ...sdk,
    isInitialized,
    error
  };
}; 