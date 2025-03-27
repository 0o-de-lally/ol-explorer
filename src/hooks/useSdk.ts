import { useCallback, useEffect } from 'react';
import { BlockchainSDK, CacheType } from '../types/blockchain';
import { useSdkContext } from '../context/SdkContext';
import { normalizeTransactionHash } from '../utils/addressUtils';
import sdkConfig from '../config/sdkConfig';

// Add a global tracker for initialization
let globalInitializationState = false;

/**
 * Hook for accessing the SDK instance.
 * This is now a thin wrapper over the SDK context.
 */
export const useSdk = (): BlockchainSDK => {
  const { sdk, isInitialized, isInitializing, error, reinitialize, isUsingMockData, clearCache } = useSdkContext();

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

  // Helper function to clear specific caches based on operation type
  const clearRelatedCache = (cacheType: CacheType) => {
    if (clearCache) {
      clearCache(cacheType);
    }
  };

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

  // Wrap the real SDK methods with additional validation, logging, and cache control
  return {
    ...sdk,
    getLatestBlockHeight: async (forceFresh = false) => {
      console.log('useSdk.getLatestBlockHeight called' + (forceFresh ? ' (forced fresh)' : ''));
      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getLatestBlockHeight');
          return 0;
        }

        // Clear blockInfo cache if forceFresh is true
        if (forceFresh) {
          clearRelatedCache('blockInfo');
        }

        const result = await sdk.getLatestBlockHeight();
        console.log('Block height:', result);
        return result;
      } catch (error) {
        console.error('Error getting block height:', error);
        return 0;
      }
    },
    getLatestEpoch: async (forceFresh = false) => {
      console.log('useSdk.getLatestEpoch called' + (forceFresh ? ' (forced fresh)' : ''));
      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getLatestEpoch');
          return 0;
        }

        // Clear blockInfo cache if forceFresh is true
        if (forceFresh) {
          clearRelatedCache('blockInfo');
        }

        const result = await sdk.getLatestEpoch();
        console.log('Epoch:', result);
        return result;
      } catch (error) {
        console.error('Error getting epoch:', error);
        return 0;
      }
    },
    getChainId: async (forceFresh = false) => {
      console.log('useSdk.getChainId called' + (forceFresh ? ' (forced fresh)' : ''));
      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getChainId');
          return '0';
        }

        // Clear blockInfo cache if forceFresh is true
        if (forceFresh) {
          clearRelatedCache('blockInfo');
        }

        const result = await sdk.getChainId();
        console.log('Chain ID:', result);
        return result;
      } catch (error) {
        console.error('Error getting chain ID:', error);
        return '0';
      }
    },
    getTransactions: async (limit = 20, forceFresh = false) => {
      console.log(`useSdk.getTransactions called with limit: ${limit}` + (forceFresh ? ' (forced fresh)' : ''));
      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getTransactions');
          return [];
        }

        // Clear transactions cache if forceFresh is true
        if (forceFresh) {
          clearRelatedCache('transactions');
        }

        const result = await sdk.getTransactions(limit);
        console.log(`Received ${result.length} transactions from SDK`);
        return result;
      } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
      }
    },
    getTransactionByHash: async (hash, forceFresh = false) => {
      console.log('useSdk.getTransactionByHash called with hash:', hash + (forceFresh ? ' (forced fresh)' : ''));

      // Validate and normalize hash
      const normalizedHash = normalizeTransactionHash(hash);
      if (!normalizedHash) {
        console.error('Invalid hash in useSdk (normalization failed):', hash);
        return null;
      }

      console.log('useSdk.getTransactionByHash - Normalized hash:', normalizedHash);

      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getTransactionByHash');
          return null;
        }

        // Clear transaction details cache for this hash if forceFresh is true
        if (forceFresh) {
          clearRelatedCache('transactionDetails');
        }

        // Call the SDK method with the normalized hash
        return await sdk.getTransactionByHash(normalizedHash);
      } catch (error) {
        console.error(`Error in useSdk.getTransactionByHash for hash ${normalizedHash}:`, error);
        return null;
      }
    },
    getAccount: async (address, forceFresh = false) => {
      console.log('useSdk.getAccount called with address:', address + (forceFresh ? ' (forced fresh)' : ''));

      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getAccount');
          return null;
        }

        // Clear account cache for this address if forceFresh is true
        if (forceFresh) {
          clearRelatedCache('accounts');
        }

        return await sdk.getAccount(address);
      } catch (error) {
        console.error(`Error in useSdk.getAccount for address ${address}:`, error);
        return null;
      }
    },
    clearCache: (type?: CacheType) => {
      clearRelatedCache(type || 'blockInfo');
    },
    isInitialized,
    error,
    isUsingMockData
  };
}; 