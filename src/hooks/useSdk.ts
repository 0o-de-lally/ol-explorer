import { useCallback, useEffect } from 'react';
import { BlockchainSDK } from '../types/blockchain';
import { useSdkContext } from '../context/SdkContext';
import { normalizeTransactionHash } from '../utils/addressUtils';

// Add a global tracker for initialization
let globalInitializationState = false;

/**
 * Hook for accessing the SDK instance.
 * This is now a thin wrapper over the SDK context.
 */
export const useSdk = (): BlockchainSDK => {
  const { sdk, isInitialized, isInitializing, error, reinitialize, isUsingMockData } = useSdkContext();

  // Log SDK status on changes
  useEffect(() => {
    const stateChanged = globalInitializationState !== isInitialized;
    console.log('SDK status changed:', {
      isInitialized,
      isInitializing,
      hasError: !!error,
      isUsingMockData,
      stateChanged
    });

    // Update global state
    if (stateChanged) {
      globalInitializationState = isInitialized;

      // Force refresh of UI when initialization state changes
      if (isInitialized) {
        console.log('SDK just initialized, forcing UI refresh');
        // Use setTimeout to ensure this happens after the current render cycle
        setTimeout(() => {
          // Directly update any DOM elements if needed for immediate visual feedback
          if (typeof document !== 'undefined') {
            const blockHeightElement = document.querySelector('[data-testid="block-height"]');
            if (blockHeightElement) {
              blockHeightElement.classList.add('initialized');
            }
          }

          // Dispatch event for components to listen to
          if (typeof window !== 'undefined') {
            const event = new Event('sdkinitialized');
            window.dispatchEvent(event);
          }
        }, 50);
      }
    }
  }, [isInitialized, isInitializing, error, isUsingMockData]);

  // If SDK is not initialized yet, return a stub that indicates that state
  if (!sdk) {
    return {
      getLatestBlockHeight: async () => {
        console.log('SDK not initialized, returning placeholder block height');
        return 0;
      },
      getLatestEpoch: async () => {
        console.log('SDK not initialized, returning placeholder epoch');
        return 0;
      },
      getChainId: async () => {
        console.log('SDK not initialized, returning placeholder chain ID');
        return '0';
      },
      getTransactions: async () => {
        console.log('SDK not initialized, returning empty transactions');
        return [];
      },
      getTransactionByHash: async (hash) => {
        console.log('SDK not initialized, returning null transaction. Hash received:', hash);
        return null;
      },
      getAccount: async () => {
        console.log('SDK not initialized, returning null account');
        return null;
      },
      isInitialized: false,
      error: error || new Error('SDK not initialized'),
      isUsingMockData: false
    };
  }

  // Wrap the real SDK methods with additional validation and logging
  return {
    ...sdk,
    getLatestBlockHeight: async () => {
      console.log('useSdk.getLatestBlockHeight called');
      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getLatestBlockHeight');
          return 0;
        }

        const result = await sdk.getLatestBlockHeight();
        console.log('Block height:', result);
        return result;
      } catch (error) {
        console.error('Error getting block height:', error);
        return 0;
      }
    },
    getLatestEpoch: async () => {
      console.log('useSdk.getLatestEpoch called');
      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getLatestEpoch');
          return 0;
        }

        const result = await sdk.getLatestEpoch();
        console.log('Epoch:', result);
        return result;
      } catch (error) {
        console.error('Error getting epoch:', error);
        return 0;
      }
    },
    getChainId: async () => {
      console.log('useSdk.getChainId called');
      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getChainId');
          return '0';
        }

        const result = await sdk.getChainId();
        console.log('Chain ID:', result);
        return result;
      } catch (error) {
        console.error('Error getting chain ID:', error);
        return '0';
      }
    },
    getTransactions: async (limit = 20) => {
      console.log(`useSdk.getTransactions called with limit: ${limit}`);
      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getTransactions');
          return [];
        }

        const result = await sdk.getTransactions(limit);
        console.log(`Received ${result.length} transactions from SDK`);
        return result;
      } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
      }
    },
    getTransactionByHash: async (hash) => {
      console.log('useSdk.getTransactionByHash called with hash:', hash);

      // Validate and normalize hash
      const normalizedHash = normalizeTransactionHash(hash);
      if (!normalizedHash) {
        console.error('Invalid hash in useSdk (normalization failed):', hash);
        return null;
      }

      console.log('useSdk.getTransactionByHash - Normalized hash:', normalizedHash);

      try {
        // Call the SDK method with the normalized hash
        return await sdk.getTransactionByHash(normalizedHash);
      } catch (error) {
        console.error(`Error in useSdk.getTransactionByHash for hash ${normalizedHash}:`, error);
        return null;
      }
    },
    isInitialized,
    error,
    isUsingMockData
  };
}; 