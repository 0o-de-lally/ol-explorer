import { useEffect } from 'react';
import { BlockchainSDK, LedgerInfo } from '../types/blockchain';
import { useSdkContext } from '../context/SdkContext';
import { normalizeAddress } from '../utils/addressUtils';
import sdkConfig from '../config/sdkConfig';
import appConfig from '../config/appConfig';

// DEBUG flag to enable SDK operation logging
// Set to true to log all SDK calls and responses
const DEBUG = true;

// Debug logging wrapper for SDK functions
const logSdkOperation = async <T>(
  operationName: string,
  params: any,
  operation: () => Promise<T>
): Promise<T> => {
  if (!DEBUG) return operation();

  console.group(`SDK Operation: ${operationName}`);
  console.log('Request Parameters:', JSON.stringify(params, null, 2));
  console.time(`${operationName} execution time`);

  try {
    const result = await operation();
    console.log('Response Data:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Operation Error:', error);
    throw error;
  } finally {
    console.timeEnd(`${operationName} execution time`);
    console.groupEnd();
  }
};

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
  getCommunityWalletNames: () => Promise<Record<string, string>>;
  hasEverBeenTouched: (address: string) => Promise<boolean>;
  getOnboardingUsecs: (address: string) => Promise<number>;
  getLastActivityUsecs: (address: string) => Promise<number>;
  isInitializedOnV8: (address: string) => Promise<boolean>;
  getCurrentValidators: () => Promise<string[]>;
  getCurrentBid: (address: string) => Promise<[number, number]>;
  getValidatorGrade: (address: string) => Promise<ValidatorGrade>;
  getJailReputation: (address: string) => Promise<number>;
  getCountBuddiesJailed: (address: string) => Promise<number>;
  isCommunityWalletInit: (address: string) => Promise<boolean>;
  isWithinAuthorizeWindow: (address: string) => Promise<boolean>;
  getVetoTally: (address: string) => Promise<number>;
  getSupplyStats: () => Promise<SupplyStats>;
  getAccountBalance: (address: string) => Promise<[string, string]>;

  // Add new methods for account type detection
  isSlowWallet: (address: string) => Promise<boolean>;
  isV8Authorized: (address: string) => Promise<boolean>;
  isInValidatorUniverse: (address: string) => Promise<boolean>;
  getUserDonations: (dvAddress: string, userAddress: string) => Promise<number>;
  getReauthTally: (address: string) => Promise<[number, number, number]>;
  getReauthDeadline: (address: string) => Promise<number>;
  isLiquidationProposed: (address: string) => Promise<boolean>;

  // Add new validator-related functions
  isJailed: (address: string) => Promise<boolean>;
  getBidders: () => Promise<string[]>;
  getMaxSeatsOffered: () => Promise<number>;
  getFilledSeats: () => Promise<number>;

  // Vouching related methods
  getAccountVouchesOutbound: (address: string) => Promise<string[]>;
  getAccountVouchesInbound: (address: string) => Promise<string[]>;
  getAccountPageRankScore: (address: string) => Promise<number>;

  // Donations related methods
  getDonationsMadeByAccount: (address: string) => Promise<any[]>;
  getDonationsReceivedByDV: (dvAddress: string) => Promise<any[]>;
} => {
  const { sdk, isInitialized, isInitializing, error, reinitialize, isUsingMockData } = useSdkContext();

  // Log SDK status on changes
  useEffect(() => {
    if (DEBUG) {
      console.log('SDK Status Change:', {
        isInitialized,
        isInitializing,
        hasError: !!error,
        errorMessage: error ? error.message : null,
        isUsingMockData
      });
    }
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

    return logSdkOperation('ext_getAccountTransactions', { address, limit, start }, async () => {
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
    });
  };

  // Activity Status Functions
  const hasEverBeenTouched = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if account has been touched');
      return false;
    }

    const viewParams = {
      function: `${OL_FRAMEWORK}::activity::has_ever_been_touched`,
      typeArguments: [],
      arguments: [normalizeAddress(address)]
    };

    return logSdkOperation('hasEverBeenTouched', { address, viewParams }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view(viewParams);

        if (Array.isArray(result) && result.length > 0) {
          return result[0] === true;
        }

        return result === true;
      } catch (error) {
        console.error(`Error checking if ${address} has been touched:`, error);
        return false;
      }
    });
  };

  const getOnboardingUsecs = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get onboarding timestamp');
      return 0;
    }

    const viewParams = {
      function: `${OL_FRAMEWORK}::activity::get_onboarding_usecs`,
      typeArguments: [],
      arguments: [normalizeAddress(address)]
    };

    return logSdkOperation('getOnboardingUsecs', { address, viewParams }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view(viewParams);

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
    });
  };

  const getLastActivityUsecs = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get last activity timestamp');
      return 0;
    }

    const viewParams = {
      function: `${OL_FRAMEWORK}::activity::get_last_activity_usecs`,
      typeArguments: [],
      arguments: [normalizeAddress(address)]
    };

    return logSdkOperation('getLastActivityUsecs', { address, viewParams }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view(viewParams);

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
    });
  };

  const isInitializedOnV8 = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if account is initialized on v8');
      return false;
    }

    const viewParams = {
      function: `${OL_FRAMEWORK}::activity::is_initialized`,
      typeArguments: [],
      arguments: [normalizeAddress(address)]
    };

    return logSdkOperation('isInitializedOnV8', { address, viewParams }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view(viewParams);

        if (Array.isArray(result) && result.length > 0) {
          return result[0] === true;
        }

        return result === true;
      } catch (error) {
        console.error(`Error checking if ${address} is initialized on v8:`, error);
        return false;
      }
    });
  };

  // Validator Status Functions
  const getCurrentValidators = async (): Promise<string[]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get current validators');
      return [];
    }

    return logSdkOperation('getCurrentValidators', {}, async () => {
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
    });
  };

  const getCurrentBid = async (address: string): Promise<[number, number]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get current bid');
      return [0, 0];
    }

    return logSdkOperation('getCurrentBid', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::proof_of_fee::current_bid`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result) && result.length >= 2) {
          return [
            typeof result[0] === 'number' ? result[0] : parseInt(result[0] || '0', 10),
            typeof result[1] === 'number' ? result[1] : parseInt(result[1] || '0', 10)
          ];
        }

        return [0, 0];
      } catch (error) {
        console.error(`Error getting current bid for ${address}:`, error);
        return [0, 0];
      }
    });
  };

  const getValidatorGrade = async (address: string): Promise<ValidatorGrade> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get validator grade');
      return { isCompliant: false, acceptedProposals: 0, failedProposals: 0 };
    }

    return logSdkOperation('getValidatorGrade', { address }, async () => {
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
    });
  };

  const getJailReputation = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get jail reputation');
      return 0;
    }

    return logSdkOperation('getJailReputation', { address }, async () => {
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
    });
  };

  const getCountBuddiesJailed = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get count of buddies jailed');
      return 0;
    }

    return logSdkOperation('getCountBuddiesJailed', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::jail::get_count_buddies_jailed`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result) && result.length > 0) {
          // Handle string values (like "12") by parsing them to numbers
          if (typeof result[0] === 'string') {
            const parsed = parseInt(result[0], 10);
            return isNaN(parsed) ? 0 : parsed;
          }
          return typeof result[0] === 'number' ? result[0] : 0;
        }

        // Handle string or number directly
        if (typeof result === 'string') {
          const parsed = parseInt(result, 10);
          return isNaN(parsed) ? 0 : parsed;
        }

        return typeof result === 'number' ? result : 0;
      } catch (error) {
        console.error(`Error getting count of buddies jailed for ${address}:`, error);
        return 0;
      }
    });
  };

  // Community Wallet Status Functions
  const isCommunityWalletInit = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if community wallet is initialized');
      return false;
    }

    return logSdkOperation('isCommunityWalletInit', { address }, async () => {
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
    });
  };

  const isWithinAuthorizeWindow = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if within authorize window');
      return false;
    }

    return logSdkOperation('isWithinAuthorizeWindow', { address }, async () => {
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
    });
  };

  const getVetoTally = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get veto tally');
      return 0;
    }

    return logSdkOperation('getVetoTally', { address }, async () => {
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
    });
  };

  // Check if an address is a Community Wallet (Donor Voice)
  const isDonorVoice = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if donor voice');
      return false;
    }

    return logSdkOperation('isDonorVoice', { address }, async () => {
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
    });
  };

  // Check if a Community Wallet is authorized (reauthorized within window)
  const isDonorVoiceAuthorized = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if donor voice is authorized');
      return false;
    }

    return logSdkOperation('isDonorVoiceAuthorized', { address }, async () => {
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
    });
  };

  // Check if reauthorization is currently proposed for a Community Wallet
  const isReauthProposed = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if reauth proposed');
      return false;
    }

    return logSdkOperation('isReauthProposed', { address }, async () => {
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
    });
  };

  // Check if an account is a founder
  const isFounder = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if founder');
      return false;
    }

    return logSdkOperation('isFounder', { address }, async () => {
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
    });
  };

  // Check if a founder has human friends (not a bot)
  const hasFounderFriends = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if founder has friends');
      return false;
    }

    return logSdkOperation('hasFounderFriends', { address }, async () => {
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
    });
  };

  // Check if an account has a valid vouch score (for founder eligibility)
  const isVoucherScoreValid = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if voucher score valid');
      return false;
    }

    return logSdkOperation('isVoucherScoreValid', { address }, async () => {
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
    });
  };

  // Get the vouch score for an account - SIMPLIFIED based on view.tsx implementation
  const getVouchScore = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get vouch score');
      return 0;
    }

    return logSdkOperation('getVouchScore', { address }, async () => {
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
    });
  };

  // Get all community wallets in the system
  const getAllCommunityWallets = async (): Promise<string[]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get community wallets');
      return [];
    }

    return logSdkOperation('getAllCommunityWallets', {}, async () => {
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
    });
  };

  // Get all community wallet names from GitHub repository
  const getCommunityWalletNames = async (): Promise<Record<string, string>> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get community wallet names');
      return {};
    }

    return logSdkOperation('getCommunityWalletNames', {}, async () => {
      try {
        const response = await fetch('https://raw.githubusercontent.com/0LNetworkCommunity/v7-addresses/refs/heads/main/community-wallets.json');

        if (!response.ok) {
          throw new Error(`GitHub API responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Validate data format
        if (!data || !data.communityWallets) {
          throw new Error('Invalid wallet name data format');
        }

        // Create a map of normalized addresses to names
        const nameMap: Record<string, string> = {};

        // For each address, normalize and extract the name
        Object.entries(data.communityWallets).forEach(([hash, info]: [string, any]) => {
          const normalizedAddress = normalizeAddress(hash);
          nameMap[normalizedAddress] = info.name || 'Community Wallet';
        });

        return nameMap;
      } catch (error) {
        console.error('Error fetching community wallet names:', error);
        // Return empty object instead of failing completely
        return {};
      }
    });
  };

  // Add this function to fetch the supply stats
  const getSupplyStats = async (): Promise<SupplyStats> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get supply stats');
      return { total: 0, slowLocked: 0, donorVoice: 0, pledge: 0, unlocked: 0 };
    }

    return logSdkOperation('getSupplyStats', {}, async () => {
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
    });
  };

  // Add new method for fetching account balance using view function
  const getAccountBalance = async (address: string): Promise<[string, string]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get account balance');
      return ["0", "0"];
    }

    return logSdkOperation('getAccountBalance', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::ol_account::balance`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        // Handle array response format - expected: [unlocked_balance, total_balance]
        if (Array.isArray(result) && result.length >= 2) {
          const unlocked = typeof result[0] === 'string' ? result[0] : String(result[0] || "0");
          const total = typeof result[1] === 'string' ? result[1] : String(result[1] || "0");
          return [unlocked, total];
        }

        // Return default if unexpected format
        console.warn('Unexpected balance format:', result);
        return ["0", "0"];
      } catch (error) {
        console.error(`Error fetching balance for ${address}:`, error);
        return ["0", "0"];
      }
    });
  };

  // Check if an account is a slow wallet
  const isSlowWallet = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if slow wallet');
      return false;
    }

    return logSdkOperation('isSlowWallet', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::slow_wallet::is_slow`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result) && result.length > 0) {
          return result[0] === true;
        }

        return result === true;
      } catch (error) {
        console.error(`Error checking if ${address} is a slow wallet:`, error);
        return false;
      }
    });
  };

  // Check if an account is v8 authorized
  const isV8Authorized = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if v8 authorized');
      return false;
    }

    return logSdkOperation('isV8Authorized', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::reauthorization::is_v8_authorized`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result) && result.length > 0) {
          return result[0] === true;
        }

        return result === true;
      } catch (error) {
        console.error(`Error checking if ${address} is v8 authorized:`, error);
        return false;
      }
    });
  };

  // Check if an account is in validator universe
  const isInValidatorUniverse = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if in validator universe');
      return false;
    }

    return logSdkOperation('isInValidatorUniverse', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::validator_universe::is_in_universe`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result) && result.length > 0) {
          return result[0] === true;
        }

        return result === true;
      } catch (error) {
        console.error(`Error checking if ${address} is in validator universe:`, error);
        return false;
      }
    });
  };

  // Get user donations to a community wallet
  const getUserDonations = async (dvAddress: string, userAddress: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get user donations');
      return 0;
    }

    return logSdkOperation('getUserDonations', { dvAddress, userAddress }, async () => {
      try {
        const normalizedDVAddress = normalizeAddress(dvAddress);
        const normalizedUserAddress = normalizeAddress(userAddress);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::donor_voice_governance::check_is_donor`,
          typeArguments: [],
          arguments: [normalizedDVAddress, normalizedUserAddress]
        });

        if (Array.isArray(result) && result.length > 0) {
          // The result might be a boolean or a number depending on the implementation
          if (typeof result[0] === 'boolean') {
            return result[0] ? 1 : 0;
          }
          return typeof result[0] === 'number' ? result[0] : 0;
        }

        return 0;
      } catch (error) {
        console.error(`Error getting user donations from ${userAddress} to ${dvAddress}:`, error);
        return 0;
      }
    });
  };

  // Get reauthorization vote tally for a community wallet
  const getReauthTally = async (address: string): Promise<[number, number, number]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get reauth tally');
      return [0, 0, 0];
    }

    return logSdkOperation('getReauthTally', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::donor_voice_governance::get_reauth_tally`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        // Returns tuple (percent approval, turnout percent, threshold needed to pass)
        if (Array.isArray(result) && result.length >= 3) {
          return [
            typeof result[0] === 'number' ? result[0] : 0,
            typeof result[1] === 'number' ? result[1] : 0,
            typeof result[2] === 'number' ? result[2] : 0
          ];
        }

        return [0, 0, 0];
      } catch (error) {
        console.error(`Error getting reauth tally for ${address}:`, error);
        return [0, 0, 0];
      }
    });
  };

  // Get reauthorization deadline for a community wallet
  const getReauthDeadline = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get reauth deadline');
      return 0;
    }

    return logSdkOperation('getReauthDeadline', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::donor_voice_governance::get_reauth_deadline`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result) && result.length > 0) {
          return typeof result[0] === 'number' ? result[0] : 0;
        }

        return typeof result === 'number' ? result : 0;
      } catch (error) {
        console.error(`Error getting reauth deadline for ${address}:`, error);
        return 0;
      }
    });
  };

  // Check if liquidation is proposed for a community wallet
  const isLiquidationProposed = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if liquidation proposed');
      return false;
    }

    return logSdkOperation('isLiquidationProposed', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::donor_voice_governance::is_liquidation_proposed`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result) && result.length > 0) {
          return result[0] === true;
        }

        return result === true;
      } catch (error) {
        console.error(`Error checking if liquidation proposed for ${address}:`, error);
        return false;
      }
    });
  };

  // Check if a validator is jailed
  const isJailed = async (address: string): Promise<boolean> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot check if validator is jailed');
      return false;
    }

    return logSdkOperation('isJailed', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::jail::is_jailed`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result) && result.length > 0) {
          return result[0] === true;
        }

        return result === true;
      } catch (error) {
        console.error(`Error checking if ${address} is jailed:`, error);
        return false;
      }
    });
  };

  // Get all bidders in the current epoch
  const getBidders = async (): Promise<string[]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get bidders');
      return [];
    }

    return logSdkOperation('getBidders', {}, async () => {
      try {
        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::proof_of_fee::get_bidders_and_bids`,
          typeArguments: [],
          arguments: [true] // pass a true to remove unqualified validators
        });

        if (Array.isArray(result) && result.length > 0) {
          // The new response format is an array of [address, [numerator, denominator]] tuples
          if (Array.isArray(result[0]) && result[0].length >= 1) {
            // Extract just the addresses (first element of each inner array)
            return result.map(item => String(item[0]));
          }
          // Fallback in case the format is different
          return result.map(addr => String(addr));
        }

        return [];
      } catch (error) {
        console.error('Error getting bidders:', error);
        return [];
      }
    });
  };

  // Get the maximum seats offered in the validator set
  const getMaxSeatsOffered = async (): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get max seats offered');
      return 0;
    }

    return logSdkOperation('getMaxSeatsOffered', {}, async () => {
      try {
        // Note: get_max_seats_offered is missing the #[view] attribute in the Move code
        // but should still work as a view function
        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::epoch_boundary::get_max_seats_offered`,
          typeArguments: [],
          arguments: []
        });

        if (Array.isArray(result) && result.length > 0) {
          return typeof result[0] === 'number' ? result[0] : parseInt(result[0] || '0', 10);
        }

        return typeof result === 'number' ? result : 0;
      } catch (error) {
        console.error('Error getting max seats offered:', error);
        return 0;
      }
    });
  };

  // Get the number of filled validator seats
  const getFilledSeats = async (): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get filled seats');
      return 0;
    }

    return logSdkOperation('getFilledSeats', {}, async () => {
      try {
        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::epoch_boundary::get_filled_seats`,
          typeArguments: [],
          arguments: []
        });

        if (Array.isArray(result) && result.length > 0) {
          return typeof result[0] === 'number' ? result[0] : parseInt(result[0] || '0', 10);
        }

        return typeof result === 'number' ? result : 0;
      } catch (error) {
        console.error('Error getting filled seats:', error);
        return 0;
      }
    });
  };

  // Vouching related methods
  const getAccountVouchesOutbound = async (address: string): Promise<string[]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get outbound vouches');
      return [];
    }

    return logSdkOperation('getAccountVouchesOutbound', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::vouch::get_given_vouches`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        // The function returns a tuple: (vector<address>, vector<u64>)
        // We only need the addresses (first element of the tuple)
        if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
          return result[0];
        }

        return [];
      } catch (error) {
        console.error(`Error getting outbound vouches for ${address}:`, error);
        return [];
      }
    });
  };

  const getAccountVouchesInbound = async (address: string): Promise<string[]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get inbound vouches');
      return [];
    }

    return logSdkOperation('getAccountVouchesInbound', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::vouch::get_received_vouches`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        // The function returns a tuple: (vector<address>, vector<u64>)
        // We only need the addresses (first element of the tuple)
        if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
          return result[0];
        }

        return [];
      } catch (error) {
        console.error(`Error getting inbound vouches for ${address}:`, error);
        return [];
      }
    });
  };

  const getAccountPageRankScore = async (address: string): Promise<number> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get page rank score');
      return 0;
    }

    return logSdkOperation('getAccountPageRankScore', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::page_rank_lazy::get_cached_score`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result) && result.length > 0) {
          return typeof result[0] === 'number' ? result[0] :
            typeof result[0] === 'string' ? parseFloat(result[0]) || 0 : 0;
        }

        return typeof result === 'number' ? result :
          typeof result === 'string' ? parseFloat(result) || 0 : 0;
      } catch (error) {
        console.error(`Error getting page rank score for ${address}:`, error);
        return 0;
      }
    });
  };

  // Donations related methods
  const getDonationsMadeByAccount = async (address: string): Promise<any[]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get user donations');
      return [];
    }

    return logSdkOperation('getDonationsMadeByAccount', { address }, async () => {
      try {
        const normalizedAddress = normalizeAddress(address);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::donor_voice_governance::get_user_donations`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result)) {
          return result;
        }

        return [];
      } catch (error) {
        console.error(`Error getting donations for ${address}:`, error);
        return [];
      }
    });
  };

  const getDonationsReceivedByDV = async (dvAddress: string): Promise<any[]> => {
    if (!isInitialized || !sdk) {
      console.warn('SDK not initialized, cannot get donations to DV');
      return [];
    }

    return logSdkOperation('getDonationsReceivedByDV', { dvAddress }, async () => {
      try {
        const normalizedAddress = normalizeAddress(dvAddress);

        const result = await sdk.view({
          function: `${OL_FRAMEWORK}::donor_voice::get_donations_to_dv`,
          typeArguments: [],
          arguments: [normalizedAddress]
        });

        if (Array.isArray(result)) {
          return result;
        }

        return [];
      } catch (error) {
        console.error(`Error getting donations to DV ${dvAddress}:`, error);
        return [];
      }
    });
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
      getCommunityWalletNames: async () => {
        console.warn('SDK not initialized, cannot get community wallet names');
        return {};
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
        return [0, 0];
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
      },
      getAccountBalance: async () => {
        console.warn('SDK not initialized, cannot get account balance');
        return ["0", "0"];
      },
      // Add the new methods
      isSlowWallet: async () => {
        console.warn('SDK not initialized, cannot check if slow wallet');
        return false;
      },
      isV8Authorized: async () => {
        console.warn('SDK not initialized, cannot check if v8 authorized');
        return false;
      },
      isInValidatorUniverse: async () => {
        console.warn('SDK not initialized, cannot check if in validator universe');
        return false;
      },
      getUserDonations: async () => {
        console.warn('SDK not initialized, cannot get user donations');
        return 0;
      },
      getReauthTally: async () => {
        console.warn('SDK not initialized, cannot get reauth tally');
        return [0, 0, 0];
      },
      getReauthDeadline: async () => {
        console.warn('SDK not initialized, cannot get reauth deadline');
        return 0;
      },
      isLiquidationProposed: async () => {
        console.warn('SDK not initialized, cannot check if liquidation proposed');
        return false;
      },
      isJailed: async () => {
        console.warn('SDK not initialized, cannot check if validator is jailed');
        return false;
      },
      getBidders: async () => {
        console.warn('SDK not initialized, cannot get bidders');
        return [];
      },
      getMaxSeatsOffered: async () => {
        console.warn('SDK not initialized, cannot get max seats offered');
        return 0;
      },
      getFilledSeats: async () => {
        console.warn('SDK not initialized, cannot get filled seats');
        return 0;
      },
      getAccountVouchesOutbound: async () => {
        console.warn('SDK not initialized, cannot get outbound vouches');
        return [];
      },
      getAccountVouchesInbound: async () => {
        console.warn('SDK not initialized, cannot get inbound vouches');
        return [];
      },
      getAccountPageRankScore: async () => {
        console.warn('SDK not initialized, cannot get page rank score');
        return 0;
      },
      getDonationsMadeByAccount: async () => {
        console.warn('SDK not initialized, cannot get user donations');
        return [];
      },
      getDonationsReceivedByDV: async () => {
        console.warn('SDK not initialized, cannot get donations to DV');
        return [];
      }
    };
  }

  // Return the SDK with some minimal wrapping to standardize inputs
  return {
    ...sdk,
    // Add address normalization for account lookups
    getAccount: async (address) => {
      if (!isInitialized || !sdk) {
        console.warn('SDK not initialized, cannot get account');
        return null;
      }

      return logSdkOperation('getAccount', { address }, async () => {
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
      });
    },
    // Wrap original SDK view method to add logging
    view: async (params) => {
      if (!isInitialized || !sdk) {
        console.warn('SDK not initialized, cannot execute view function');
        return null;
      }

      return logSdkOperation('view', params, async () => {
        return await sdk.view(params);
      });
    },
    // Wrap original SDK viewJson method to add logging
    viewJson: async (params) => {
      if (!isInitialized || !sdk) {
        console.warn('SDK not initialized, cannot execute viewJson function');
        return null;
      }

      return logSdkOperation('viewJson', params, async () => {
        return await sdk.viewJson(params);
      });
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
    getCommunityWalletNames,
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
    getSupplyStats,
    getAccountBalance,

    // Add the new methods
    isSlowWallet,
    isV8Authorized,
    isInValidatorUniverse,
    getUserDonations,
    getReauthTally,
    getReauthDeadline,
    isLiquidationProposed,
    isJailed,
    getBidders,
    getMaxSeatsOffered,
    getFilledSeats,
    getAccountVouchesOutbound,
    getAccountVouchesInbound,
    getAccountPageRankScore,
    getDonationsMadeByAccount,
    getDonationsReceivedByDV
  };
}; 