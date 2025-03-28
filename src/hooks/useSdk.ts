import { useEffect } from 'react';
import { BlockchainSDK, LedgerInfo } from '../types/blockchain';
import { useSdkContext } from '../context/SdkContext';
import { normalizeAddress } from '../utils/addressUtils';

/**
 * Hook for accessing the SDK instance.
 * This is a thin wrapper over the SDK context that handles address normalization.
 */
export const useSdk = (): BlockchainSDK & {
  ext_getAccountTransactions: (address: string, limit?: number) => Promise<any[]>;
} => {
  const { sdk, isInitialized, isInitializing, error, reinitialize, isUsingMockData } = useSdkContext();

  // Log SDK status on changes
  useEffect(() => {
    console.log('SDK status changed:', {
      isInitialized,
      isInitializing,
      hasError: !!error,
      isUsingMockData
    });
  }, [isInitialized, isInitializing, error, isUsingMockData]);

  // Extension function to get account transactions
  const ext_getAccountTransactions = async (
    address: string, 
    limit: number = 25, 
    start?: string
  ): Promise<any[]> => {
    console.log(`ext_getAccountTransactions called for address: ${address}, limit: ${limit}, start: ${start || 'none'}`);
    
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get account transactions');
      return [];
    }
    
    try {
      // Normalize the address for consistency
      const normalizedAddress = normalizeAddress(address);
      
      // Build the REST API endpoint URL with pagination parameters
      let restUrl = `https://rpc.openlibra.space:8080/v1/accounts/${normalizedAddress}/transactions?limit=${limit}`;
      if (start) {
        restUrl += `&start=${start}`;
      }
      console.log(`Fetching from REST endpoint: ${restUrl}`);
      
      const response = await fetch(restUrl);
      
      if (!response.ok) {
        throw new Error(`REST API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we got valid transactions data
      if (Array.isArray(data)) {
        console.log(`Found ${data.length} transactions for account ${normalizedAddress}`);
        return data;
      }
      
      console.warn('Unexpected response format from REST API');
      return [];
    } catch (error) {
      console.error('Error fetching account transactions:', error);
      
      // Fall back to SDK filtering method if REST API fails
      console.log('Falling back to client-side filtering approach');
      
      try {
        // Note: This fallback method doesn't support proper pagination
        // For a production app, we might want to implement more sophisticated fallback
        const allTxs = await sdk.getTransactions(limit * 2, true);
        
        // Filter transactions where the sender matches our address
        const normalizedAddress = normalizeAddress(address);
        const filteredTxs = allTxs.filter(tx => 
          tx.sender && 
          tx.sender.toLowerCase() === normalizedAddress.toLowerCase()
        ).slice(0, limit);
        
        console.log(`Found ${filteredTxs.length} transactions for account ${normalizedAddress} via filtering`);
        return filteredTxs;
      } catch (sdkError) {
        console.error('Error with fallback method:', sdkError);
        return [];
      }
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
      getLedgerInfo: async () => {
        console.log('SDK not initialized, returning placeholder ledger info');
        return {
          chain_id: '0',
          epoch: '0',
          ledger_version: '0',
          oldest_ledger_version: '0',
          ledger_timestamp: Date.now().toString(),
          node_role: 'unknown',
          oldest_block_height: '0',
          block_height: '0',
          git_hash: ''
        } as LedgerInfo;
      },
      isInitialized: false,
      error: error || new Error('SDK not initialized'),
      isUsingMockData: false,
      ext_getAccountTransactions: async () => {
        console.log('SDK not initialized, cannot get account transactions');
        return [];
      }
    };
  }

  // Return the SDK with some minimal wrapping to standardize inputs
  return {
    ...sdk,
    // Add address normalization for account lookups
    getAccount: async (address) => {
      console.log('useSdk.getAccount called with address:', address);

      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getAccount');
          return null;
        }

        // Normalize address before passing to SDK
        if (address && typeof address === 'string') {
          const normalizedAddress = normalizeAddress(address);
          console.log(`Normalized address: ${normalizedAddress} (original: ${address})`);
          return await sdk.getAccount(normalizedAddress);
        }

        return await sdk.getAccount(address);
      } catch (error) {
        console.error(`Error in useSdk.getAccount for address ${address}:`, error);
        return null;
      }
    },
    isInitialized,
    error,
    isUsingMockData,
    ext_getAccountTransactions
  };
}; 