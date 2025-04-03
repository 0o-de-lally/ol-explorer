import { useEffect } from 'react';
import { BlockchainSDK, LedgerInfo } from '../types/blockchain';
import { useSdkContext } from '../context/SdkContext';
import { normalizeAddress } from '../utils/addressUtils';
import sdkConfig from '../config/sdkConfig';

/**
 * Hook for accessing the SDK instance.
 * This is a thin wrapper over the SDK context that handles address normalization.
 */
export const useSdk = (): BlockchainSDK & {
  ext_getAccountTransactions: (address: string, limit?: number) => Promise<any[]>;
  isDonorVoice: (address: string) => Promise<boolean>;
  isDonorVoiceAuthorized: (address: string) => Promise<boolean>;
  isReauthProposed: (address: string) => Promise<boolean>;
  isFounder: (address: string) => Promise<boolean>;
  hasFounderFriends: (address: string) => Promise<boolean>;
  isVoucherScoreValid: (address: string) => Promise<boolean>;
  getVouchScore: (address: string) => Promise<number>;
  getAllCommunityWallets: () => Promise<string[]>;
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
      let restUrl = `${sdkConfig.rpcUrl}/accounts/${normalizedAddress}/transactions?limit=${limit}`;
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

  // OL Framework module namespace (usually 0x1 on mainnet)
  const OL_FRAMEWORK = "0x1";

  // Check if an address is a Community Wallet (Donor Voice)
  const isDonorVoice = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if donor voice');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);
      console.log(`Checking if address ${normalizedAddress} is a donor voice`);

      // Use view function directly with proper argument formatting
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::donor_voice::is_donor_voice`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      console.log(`isDonorVoice result for ${normalizedAddress}:`, result);

      // Handle the case where the result is an array containing the boolean
      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if ${address} is donor voice:`, error);
      return false;
    }
  };

  // Check if a Community Wallet is authorized (reauthorized within window)
  const isDonorVoiceAuthorized = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if donor voice is authorized');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);
      console.log(`Checking if donor voice ${normalizedAddress} is authorized`);

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::donor_voice_reauth::is_authorized`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      console.log(`isDonorVoiceAuthorized result for ${normalizedAddress}:`, result);

      // Handle the case where the result is an array containing the boolean
      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if ${address} is authorized:`, error);
      return false;
    }
  };

  // Check if reauthorization is currently proposed for a Community Wallet
  const isReauthProposed = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if reauth proposed');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);
      console.log(`Checking if reauth is proposed for ${normalizedAddress}`);

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::donor_voice_governance::is_reauth_proposed`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      console.log(`isReauthProposed result for ${normalizedAddress}:`, result);

      // Handle the case where the result is an array containing the boolean
      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if reauth proposed for ${address}:`, error);
      return false;
    }
  };

  // Check if an account is a founder
  const isFounder = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if founder');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);
      console.log(`Checking if address ${normalizedAddress} is a founder`);

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::founder::is_founder`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      console.log(`isFounder result for ${normalizedAddress}:`, result);

      // Handle the case where the result is an array containing the boolean
      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if ${address} is founder:`, error);

      // Check if it's a "module not found" error, which means we're on testnet
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("can't be found") || errorMessage.includes("invalid_input")) {
        console.log(`Module founder not found. This is expected on testnet.`);
      }

      return false;
    }
  };

  // Check if a founder has human friends (not a bot)
  const hasFounderFriends = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if founder has friends');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);
      console.log(`Checking if founder ${normalizedAddress} has friends`);

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::founder::has_friends`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      console.log(`hasFounderFriends result for ${normalizedAddress}:`, result);

      // Handle the case where the result is an array containing the boolean
      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if founder ${address} has friends:`, error);

      // Check if it's a "module not found" error, which means we're on testnet
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("can't be found") || errorMessage.includes("invalid_input")) {
        console.log(`Module founder not found. This is expected on testnet.`);
      }

      return false;
    }
  };

  // Check if an account has a valid vouch score (for founder eligibility)
  const isVoucherScoreValid = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if voucher score valid');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);
      console.log(`Checking if ${normalizedAddress} has valid voucher score`);

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::founder::is_voucher_score_valid`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      console.log(`isVoucherScoreValid result for ${normalizedAddress}:`, result);

      // Handle the case where the result is an array containing the boolean
      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if ${address} has valid voucher score:`, error);

      // Check if it's a "module not found" error, which means we're on testnet
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("can't be found") || errorMessage.includes("invalid_input")) {
        console.log(`Module founder not found. This is expected on testnet.`);
      }

      return false;
    }
  };

  // Get the vouch score for an account
  const getVouchScore = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get vouch score');
      return 0;
    }

    try {
      const normalizedAddress = normalizeAddress(address);
      console.log(`Getting vouch score for ${normalizedAddress}`);

      // First get the current roots of trust
      const rootsOfTrust = await sdk.view({
        function: `${OL_FRAMEWORK}::root_of_trust::get_current_roots_at_registry`,
        typeArguments: [],
        arguments: [OL_FRAMEWORK]
      });

      // Get the roots from the array response if needed
      const processedRoots = Array.isArray(rootsOfTrust) ? rootsOfTrust : [rootsOfTrust];

      // Get the vouch score
      const score = await sdk.view({
        function: `${OL_FRAMEWORK}::vouch_score::evaluate_users_vouchers`,
        typeArguments: [],
        arguments: [processedRoots, normalizedAddress]
      });

      console.log(`getVouchScore result for ${normalizedAddress}:`, score);

      // Handle the case where the result is an array containing the score
      if (Array.isArray(score) && score.length > 0) {
        return typeof score[0] === 'number' ? score[0] : 0;
      }

      return typeof score === 'number' ? score : 0;
    } catch (error) {
      console.error(`Error getting vouch score for ${address}:`, error);
      return 0;
    }
  };

  // Get all community wallets in the system
  const getAllCommunityWallets = async (): Promise<string[]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get community wallets');
      return [];
    }

    try {
      console.log('Getting all community wallets');

      const walletAddresses = await sdk.view({
        function: `${OL_FRAMEWORK}::donor_voice::get_root_registry`,
        typeArguments: [],
        arguments: []
      });

      return Array.isArray(walletAddresses) ? walletAddresses : [];
    } catch (error) {
      console.error('Error getting community wallets:', error);

      // Check if it's a "module not found" error, which means we're on testnet
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("can't be found") || errorMessage.includes("invalid_input")) {
        console.log(`Module donor_voice not found. This is expected on testnet.`);
      }

      return [];
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
      view: async (params) => {
        console.log('SDK not initialized, returning null for view function. Function called:', params.function);
        return null;
      },
      viewJson: async (params) => {
        console.log('SDK not initialized, returning null for viewJson function. Function called:', params.function);
        return null;
      },
      isInitialized: false,
      error: error || new Error('SDK not initialized'),
      isUsingMockData: false,
      ext_getAccountTransactions: async () => {
        console.log('SDK not initialized, cannot get account transactions');
        return [];
      },
      isDonorVoice: async () => {
        console.log('SDK not initialized, cannot check if donor voice');
        return false;
      },
      isDonorVoiceAuthorized: async () => {
        console.log('SDK not initialized, cannot check if donor voice is authorized');
        return false;
      },
      isReauthProposed: async () => {
        console.log('SDK not initialized, cannot check if reauth proposed');
        return false;
      },
      isFounder: async () => {
        console.log('SDK not initialized, cannot check if founder');
        return false;
      },
      hasFounderFriends: async () => {
        console.log('SDK not initialized, cannot check if founder has friends');
        return false;
      },
      isVoucherScoreValid: async () => {
        console.log('SDK not initialized, cannot check if voucher score valid');
        return false;
      },
      getVouchScore: async () => {
        console.log('SDK not initialized, cannot get vouch score');
        return 0;
      },
      getAllCommunityWallets: async () => {
        console.log('SDK not initialized, cannot get community wallets');
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
    ext_getAccountTransactions,
    isDonorVoice,
    isDonorVoiceAuthorized,
    isReauthProposed,
    isFounder,
    hasFounderFriends,
    isVoucherScoreValid,
    getVouchScore,
    getAllCommunityWallets
  };
}; 