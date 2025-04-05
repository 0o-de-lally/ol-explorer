import {useEffect} from 'react';
import {BlockchainSDK, LedgerInfo} from '../types/blockchain';
import {useSdkContext} from '../context/SdkContext';
import {normalizeAddress} from '../utils/addressUtils';
import sdkConfig from '../config/sdkConfig';
import appConfig from '../config/appConfig';

// Interface for validator grade tuple response
export interface ValidatorGrade {
  isCompliant: boolean;
  acceptedProposals: number;
  failedProposals: number;
}

// Add this interface to define the return type of supply stats
export interface SupplyStats {
  total: number;
  slowLocked: number;
  donorVoice: number;
  pledge: number;
  unlocked: number;
}

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
  hasEverBeenTouched: (address: string) => Promise<boolean>;
  getOnboardingUsecs: (address: string) => Promise<number>;
  getLastActivityUsecs: (address: string) => Promise<number>;
  isInitializedOnV8: (address: string) => Promise<boolean>;
  getCurrentValidators: () => Promise<string[]>;
  getCurrentBid: (address: string) => Promise<number>;
  getValidatorGrade: (address: string) => Promise<ValidatorGrade>;
  getJailReputation: (address: string) => Promise<number>;
  getCountBuddiesJailed: (address: string) => Promise<number>;
  isCommunityWalletInit: (address: string) => Promise<boolean>;
  isWithinAuthorizeWindow: (address: string) => Promise<boolean>;
  getVetoTally: (address: string) => Promise<number>;
  getSupplyStats: () => Promise<SupplyStats>;
} => {
  const { sdk, isInitialized, isInitializing, error, reinitialize, isUsingMockData } = useSdkContext();

  // Log SDK status on changes
  useEffect(() => {
    // No need to log SDK status changes
  }, [isInitialized, isInitializing, error, isUsingMockData]);

  // OL Framework module namespace (usually 0x1 on mainnet)
  const OL_FRAMEWORK = appConfig.network.OL_FRAMEWORK;

  // Extension function to get account transactions
  const ext_getAccountTransactions = async (
    address: string,
    limit: number = 25,
    start?: string
  ): Promise<any[]> => {
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

      const response = await fetch(restUrl);

      if (!response.ok) {
        throw new Error(`REST API responded with status: ${response.status}`);
      }

      const data = await response.json();

      // Check if we got valid transactions data
      if (Array.isArray(data)) {
        return data;
      }

      console.warn('Unexpected response format from REST API');
      return [];
    } catch (error) {
      console.error('Error fetching account transactions:', error);

      // Fall back to SDK filtering method if REST API fails
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

        return filteredTxs;
      } catch (sdkError) {
        console.error('Error with fallback method:', sdkError);
        return [];
      }
    }
  };

  // Activity Status Functions
  const hasEverBeenTouched = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if account has been touched');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::activity::has_ever_been_touched`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if ${address} has been touched:`, error);
      return false;
    }
  };

  const getOnboardingUsecs = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get onboarding timestamp');
      return 0;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::activity::get_onboarding_usecs`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      // Handle array response format
      if (Array.isArray(result) && result.length > 0) {
        // Extract the value from the array
        const value = result[0];
        // Convert to number if needed
        if (typeof value === 'string') {
          return parseInt(value, 10);
        }
        return typeof value === 'number' ? value : 0;
      }

      // Handle string response
      if (typeof result === 'string') {
        return parseInt(result, 10);
      }

      // Handle direct number
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.error(`Error getting onboarding timestamp for ${address}:`, error);
      return 0;
    }
  };

  const getLastActivityUsecs = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get last activity timestamp');
      return 0;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::activity::get_last_activity_usecs`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      if (Array.isArray(result) && result.length > 0) {
        // Extract the value from the array
        const value = result[0];
        // Convert to number if needed
        if (typeof value === 'string') {
          return parseInt(value, 10);
        }
        return typeof value === 'number' ? value : 0;
      }

      // Handle string response
      if (typeof result === 'string') {
        return parseInt(result, 10);
      }

      // Handle direct number
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.error(`Error getting last activity timestamp for ${address}:`, error);
      return 0;
    }
  };

  const isInitializedOnV8 = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if account is initialized on v8');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::activity::is_initialized`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if ${address} is initialized on v8:`, error);
      return false;
    }
  };

  // Validator Status Functions
  const getCurrentValidators = async (): Promise<string[]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get current validators');
      return [];
    }

    try {
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::stake::get_current_validators`,
        typeArguments: [],
        arguments: []
      });

      // Handle nested arrays (common response pattern from the API)
      if (Array.isArray(result)) {
        // Check if this is a nested array [[addr1, addr2, ...]]
        if (result.length === 1 && Array.isArray(result[0])) {
          const innerArray = result[0];
          // Make sure each address is a proper string
          const validators = innerArray.map((v: any) => String(v));
          return validators;
        }

        // Check if any element is itself an array of addresses
        for (const item of result) {
          if (Array.isArray(item)) {
            // Convert each item to string to ensure it's a valid address
            const addresses = item.map((addr: any) => String(addr));
            return addresses;
          }
        }

        // Regular array of values
        const validators = result.map((v: any) => {
          if (typeof v === 'string') return v;
          // If it's an object, try to access common address fields
          if (v && typeof v === 'object') {
            if ('addr' in v) return String(v.addr);
            if ('address' in v) return String(v.address);
          }
          return String(v);
        });

        // If the result is a single comma-separated string, try to split it
        if (validators.length === 1 && typeof validators[0] === 'string' && validators[0].includes(',')) {
          const splitAddresses = validators[0].split(',').map(addr => addr.trim());
          return splitAddresses;
        }

        return validators;
      } else if (result && typeof result === 'object') {
        // Handle object response types
        if ('validators' in result && Array.isArray((result as any).validators)) {
          const validators = (result as any).validators.map((v: any) => String(v));
          return validators;
        }

        // Try to extract all string values from the object
        const allValues = Object.values(result as Record<string, any>);
        const stringValidators = allValues.filter((v: any) =>
          typeof v === 'string' ||
          (typeof v === 'object' && v !== null && ('addr' in v || 'address' in v))
        ).map((v: any) => {
          if (typeof v === 'string') return v;
          if (v && typeof v === 'object') {
            if ('addr' in v) return String(v.addr);
            if ('address' in v) return String(v.address);
          }
          return '';
        }).filter(Boolean) as string[];

        if (stringValidators.length > 0) {
          return stringValidators;
        }
      }

      // No valid data found
      return [];
    } catch (error) {
      console.error('Error getting current validators:', error);
      return [];
    }
  };

  const getCurrentBid = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get current bid');
      return 0;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::proof_of_fee::current_bid`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      if (Array.isArray(result) && result.length > 0) {
        return typeof result[0] === 'number' ? result[0] : 0;
      }

      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.error(`Error getting current bid for ${address}:`, error);
      return 0;
    }
  };

  const getValidatorGrade = async (address: string): Promise<ValidatorGrade> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get validator grade');
      return { isCompliant: false, acceptedProposals: 0, failedProposals: 0 };
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::grade::get_validator_grade`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      // Handle array response format - the API returns a tuple [bool, u64, u64]
      if (Array.isArray(result) && result.length >= 3) {
        return {
          isCompliant: result[0] === true || result[0] === 'true',
          acceptedProposals: typeof result[1] === 'string' ? parseInt(result[1], 10) : Number(result[1]),
          failedProposals: typeof result[2] === 'string' ? parseInt(result[2], 10) : Number(result[2])
        };
      }

      // Default empty result if the format is unexpected
      console.warn(`Unexpected validator grade format:`, result);
      return { isCompliant: false, acceptedProposals: 0, failedProposals: 0 };
    } catch (error) {
      console.error(`Error getting validator grade for ${address}:`, error);
      return { isCompliant: false, acceptedProposals: 0, failedProposals: 0 };
    }
  };

  const getJailReputation = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get jail reputation');
      return 0;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::jail::get_jail_reputation`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      if (Array.isArray(result) && result.length > 0) {
        return typeof result[0] === 'number' ? result[0] : 0;
      }

      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.error(`Error getting jail reputation for ${address}:`, error);
      return 0;
    }
  };

  const getCountBuddiesJailed = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get count of buddies jailed');
      return 0;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::jail::get_count_buddies_jailed`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      if (Array.isArray(result) && result.length > 0) {
        return typeof result[0] === 'number' ? result[0] : 0;
      }

      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.error(`Error getting count of buddies jailed for ${address}:`, error);
      return 0;
    }
  };

  // Community Wallet Status Functions
  const isCommunityWalletInit = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if community wallet is initialized');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::community_wallet::is_init`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if ${address} is an initialized community wallet:`, error);
      return false;
    }
  };

  const isWithinAuthorizeWindow = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if within authorize window');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::donor_voice_reauth::is_within_authorize_window`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      if (Array.isArray(result) && result.length > 0) {
        return result[0] === true;
      }

      return result === true;
    } catch (error) {
      console.error(`Error checking if ${address} is within authorize window:`, error);
      return false;
    }
  };

  const getVetoTally = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get veto tally');
      return 0;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::donor_voice_governance::get_veto_tally`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

      if (Array.isArray(result) && result.length > 0) {
        return typeof result[0] === 'number' ? result[0] : 0;
      }

      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.error(`Error getting veto tally for ${address}:`, error);
      return 0;
    }
  };

  // Check if an address is a Community Wallet (Donor Voice)
  const isDonorVoice = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if donor voice');
      return false;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      // Use view function directly with proper argument formatting
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::donor_voice::is_donor_voice`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

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

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::donor_voice_reauth::is_authorized`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

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

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::donor_voice_governance::is_reauth_proposed`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

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

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::founder::is_founder`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

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

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::founder::has_friends`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

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

      // Use view function directly
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::founder::is_voucher_score_valid`,
        typeArguments: [],
        arguments: [normalizedAddress]
      });

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

  // Get the vouch score for an account - SIMPLIFIED based on view.tsx implementation
  const getVouchScore = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get vouch score');
      return 0;
    }

    try {
      const normalizedAddress = normalizeAddress(address);

      // Directly use the hard-coded root of trust ["0x1"] as seen in the working view.tsx implementation
      const score = await sdk.view({
        function: `${OL_FRAMEWORK}::vouch_score::evaluate_users_vouchers`,
        typeArguments: [],
        arguments: [[OL_FRAMEWORK], normalizedAddress]
      });

      // Handle the case where the result is an array containing the score
      if (Array.isArray(score) && score.length > 0) {
        // Handle string value
        if (typeof score[0] === 'string') {
          return parseFloat(score[0]) || 0;
        }
        return typeof score[0] === 'number' ? score[0] : 0;
      }

      // Handle direct string value
      if (typeof score === 'string') {
        return parseFloat(score) || 0;
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

  // Add this function to fetch the supply stats
  const getSupplyStats = async (): Promise<SupplyStats> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get supply stats');
      return { total: 0, slowLocked: 0, donorVoice: 0, pledge: 0, unlocked: 0 };
    }

    try {
      const result = await sdk.view({
        function: `${OL_FRAMEWORK}::supply::get_stats`,
        typeArguments: [],
        arguments: []
      });

      // Check if result is an array with 5 elements (total, slow_locked, donor_voice, pledge, unlocked)
      if (Array.isArray(result) && result.length >= 5) {
        return {
          total: parseFloat(result[0]) || 0,
          slowLocked: parseFloat(result[1]) || 0,
          donorVoice: parseFloat(result[2]) || 0,
          pledge: parseFloat(result[3]) || 0,
          unlocked: parseFloat(result[4]) || 0
        };
      }

      console.warn('Unexpected supply stats format:', result);
      return { total: 0, slowLocked: 0, donorVoice: 0, pledge: 0, unlocked: 0 };
    } catch (error) {
      console.error('Error getting supply stats:', error);
      return { total: 0, slowLocked: 0, donorVoice: 0, pledge: 0, unlocked: 0 };
    }
  };

  // If SDK is not initialized yet, return a stub that indicates that state
  if (!sdk) {
    return {
      getLatestBlockHeight: async () => {
        console.warn('SDK not initialized, returning placeholder block height');
        return 0;
      },
      getLatestEpoch: async () => {
        console.warn('SDK not initialized, returning placeholder epoch');
        return 0;
      },
      getChainId: async () => {
        console.warn('SDK not initialized, returning placeholder chain ID');
        return '0';
      },
      getTransactions: async () => {
        console.warn('SDK not initialized, returning empty transactions');
        return [];
      },
      getTransactionByHash: async (hash) => {
        console.warn('SDK not initialized, returning null transaction. Hash received:', hash);
        return null;
      },
      getAccount: async () => {
        console.warn('SDK not initialized, returning null account');
        return null;
      },
      getLedgerInfo: async () => {
        console.warn('SDK not initialized, returning placeholder ledger info');
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
        console.warn('SDK not initialized, returning null for view function. Function called:', params.function);
        return null;
      },
      viewJson: async (params) => {
        console.warn('SDK not initialized, returning null for viewJson function. Function called:', params.function);
        return null;
      },
      isInitialized: false,
      error: error || new Error('SDK not initialized'),
      isUsingMockData: false,
      ext_getAccountTransactions: async () => {
        console.warn('SDK not initialized, cannot get account transactions');
        return [];
      },
      isDonorVoice: async () => {
        console.warn('SDK not initialized, cannot check if donor voice');
        return false;
      },
      isDonorVoiceAuthorized: async () => {
        console.warn('SDK not initialized, cannot check if donor voice is authorized');
        return false;
      },
      isReauthProposed: async () => {
        console.warn('SDK not initialized, cannot check if reauth proposed');
        return false;
      },
      isFounder: async () => {
        console.warn('SDK not initialized, cannot check if founder');
        return false;
      },
      hasFounderFriends: async () => {
        console.warn('SDK not initialized, cannot check if founder has friends');
        return false;
      },
      isVoucherScoreValid: async () => {
        console.warn('SDK not initialized, cannot check if voucher score valid');
        return false;
      },
      getVouchScore: async () => {
        console.warn('SDK not initialized, cannot get vouch score');
        return 0;
      },
      getAllCommunityWallets: async () => {
        console.warn('SDK not initialized, cannot get community wallets');
        return [];
      },
      // Activity status stub functions
      hasEverBeenTouched: async () => {
        console.warn('SDK not initialized, cannot check if account has been touched');
        return false;
      },
      getOnboardingUsecs: async () => {
        console.warn('SDK not initialized, cannot get onboarding timestamp');
        return 0;
      },
      getLastActivityUsecs: async () => {
        console.warn('SDK not initialized, cannot get last activity timestamp');
        return 0;
      },
      isInitializedOnV8: async () => {
        console.warn('SDK not initialized, cannot check if account is initialized on v8');
        return false;
      },
      // Validator status stub functions
      getCurrentValidators: async () => {
        console.warn('SDK not initialized, cannot get current validators');
        return [];
      },
      getCurrentBid: async () => {
        console.warn('SDK not initialized, cannot get current bid');
        return 0;
      },
      getValidatorGrade: async () => {
        console.warn('SDK not initialized, cannot get validator grade');
        return { isCompliant: false, acceptedProposals: 0, failedProposals: 0 };
      },
      getJailReputation: async () => {
        console.warn('SDK not initialized, cannot get jail reputation');
        return 0;
      },
      getCountBuddiesJailed: async () => {
        console.warn('SDK not initialized, cannot get count of buddies jailed');
        return 0;
      },
      // Community wallet status stub functions
      isCommunityWalletInit: async () => {
        console.warn('SDK not initialized, cannot check if community wallet is initialized');
        return false;
      },
      isWithinAuthorizeWindow: async () => {
        console.warn('SDK not initialized, cannot check if within authorize window');
        return false;
      },
      getVetoTally: async () => {
        console.warn('SDK not initialized, cannot get veto tally');
        return 0;
      },
      getSupplyStats: async () => {
        console.warn('SDK not initialized, cannot get supply stats');
        return { total: 0, slowLocked: 0, donorVoice: 0, pledge: 0, unlocked: 0 };
      }
    };
  }

  // Return the SDK with some minimal wrapping to standardize inputs
  return {
    ...sdk,
    // Add address normalization for account lookups
    getAccount: async (address) => {
      console.warn('useSdk.getAccount called with address:', address);

      try {
        if (!sdk.isInitialized) {
          console.warn('SDK not fully initialized when calling getAccount');
          return null;
        }

        // Normalize address before passing to SDK
        if (address && typeof address === 'string') {
          const normalizedAddress = normalizeAddress(address);
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
    // Community wallet & founder functions
    isDonorVoice,
    isDonorVoiceAuthorized,
    isReauthProposed,
    isFounder,
    hasFounderFriends,
    isVoucherScoreValid,
    getVouchScore,
    getAllCommunityWallets,
    // Activity status functions
    hasEverBeenTouched,
    getOnboardingUsecs,
    getLastActivityUsecs,
    isInitializedOnV8,
    // Validator status functions
    getCurrentValidators,
    getCurrentBid,
    getValidatorGrade,
    getJailReputation,
    getCountBuddiesJailed,
    // Community wallet status functions
    isCommunityWalletInit,
    isWithinAuthorizeWindow,
    getVetoTally,
    getSupplyStats
  };
}; 