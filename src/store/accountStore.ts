import { observable } from '@legendapp/state';
import { Account, AccountResource } from '../types/blockchain';
import { ValidatorGrade } from '../hooks/useSdk';

// Config for data freshness
export const ACCOUNT_DATA_CONFIG = {
    // Minimum freshness in milliseconds (10 seconds)
    MIN_FRESHNESS_MS: 10000,
    // Auto-refresh interval in milliseconds (30 seconds)
    REFRESH_INTERVAL_MS: 30000
};

// Extended account data interface
export interface ExtendedAccountData {
    communityWallet: {
        isDonorVoice: boolean;
        isAuthorized: boolean;
        isReauthProposed: boolean;
        isInitialized: boolean;
        isWithinAuthorizeWindow: boolean;
        vetoTally: number;
    };
    founder: {
        isFounder: boolean;
        hasFriends: boolean;
    };
    vouching: {
        vouchScore: number;
        hasValidVouchScore: boolean;
    };
    activity: {
        hasBeenTouched: boolean;
        onboardingTimestamp: number;
        lastActivityTimestamp: number;
        isInitializedOnV8: boolean;
    };
    validator: {
        isValidator: boolean;
        currentBid: number;
        grade: ValidatorGrade;
        jailReputation: number;
        countBuddiesJailed: number;
    };
}

// Add to the Account interface or define a new extension to it
export interface AccountBalanceInfo {
    total: string;
    unlocked: string;
}

// Define the account store structure
export interface AccountStoreType {
    accounts: Record<string, {
        data: Account | null;
        extendedData: ExtendedAccountData | null;
        lastUpdated: number;
        isLoading: boolean;
        error: string | null;
    }>;
    activeAddress: string | null;
}

// Add this helper function after the imports and before store initialization
/**
 * Helper to check if an object is array-like and should be normalized to a proper array
 * (has sequential numeric keys starting from 0)
 */
const isArrayLike = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;

    const keys = Object.keys(obj);
    return keys.length > 0 &&
        keys.every((key, index) => Number(key) === index) &&
        !isNaN(Number(keys[0]));
};

/**
 * Ensure deep structures like arrays remain as arrays through the store
 * This is particularly important for resource data like epoch_vouched and outgoing_vouches
 */
const ensureProperDataStructures = (data: any): any => {
    if (data === null || data === undefined) {
        return data;
    }

    // Handle primitive values
    if (typeof data !== 'object') {
        return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => ensureProperDataStructures(item));
    }

    // Check if object is array-like
    if (isArrayLike(data)) {
        const arrayLength = Object.keys(data).length;
        const properArray = [];

        for (let i = 0; i < arrayLength; i++) {
            properArray.push(ensureProperDataStructures(data[i]));
        }

        return properArray;
    }

    // Regular objects
    const result: Record<string, any> = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            result[key] = ensureProperDataStructures(data[key]);
        }
    }

    return result;
};

// Initialize the store with default values
export const accountStore = observable<AccountStoreType>({
    accounts: {},
    activeAddress: null
});

// Function to notify global state updates
const notifyUpdate = () => {
    // Update lastUpdated timestamp to trigger reactivity
    accountStore.set(prev => ({
        ...prev,
        accounts: {
            ...prev.accounts
        }
    }));
};

// Store actions for updating state
export const accountActions = {
    setActiveAddress: (address: string | null) => {
        accountStore.activeAddress.set(address);
        notifyUpdate();
    },

    startLoading: (address: string) => {
        // Initialize account entry if it doesn't exist
        if (!accountStore.accounts[address].peek()) {
            accountStore.accounts[address].set({
                data: null,
                extendedData: null,
                lastUpdated: 0,
                isLoading: true,
                error: null
            });
        } else {
            accountStore.accounts[address].isLoading.set(true);
            accountStore.accounts[address].error.set(null);
        }
        notifyUpdate();
    },

    setAccountData: (address: string, account: Account | null, balanceInfo?: AccountBalanceInfo) => {
        // Validate account data
        if (account) {
            // Ensure required fields exist
            if (!account.address) {
                console.error('Account data missing address field');
                account.address = address;
            }

            // Only initialize resources if it's null/undefined; preserve original structure
            if (account.resources === null || account.resources === undefined) {
                account.resources = [];
            }

            // Update balance from separate balance info if provided
            if (balanceInfo) {
                account.balance = parseInt(balanceInfo.total, 10) || 0;
                // Add unlocked balance as a property (now properly defined in the Account interface)
                account.unlocked_balance = parseInt(balanceInfo.unlocked, 10) || 0;
            }
        }

        // Initialize account entry if it doesn't exist
        if (!accountStore.accounts[address].peek()) {
            accountStore.accounts[address].set({
                data: account,
                extendedData: null,
                lastUpdated: Date.now(),
                isLoading: false,
                error: null
            });
        } else {
            accountStore.accounts[address].data.set(account);
            accountStore.accounts[address].lastUpdated.set(Date.now());
            accountStore.accounts[address].isLoading.set(false);
        }
        notifyUpdate();
    },

    setExtendedData: (address: string, extendedData: ExtendedAccountData | null) => {
        // Initialize account entry if it doesn't exist
        if (!accountStore.accounts[address].peek()) {
            accountStore.accounts[address].set({
                data: null,
                extendedData: extendedData,
                lastUpdated: Date.now(),
                isLoading: false,
                error: null
            });
        } else {
            accountStore.accounts[address].extendedData.set(extendedData);
        }
        notifyUpdate();
    },

    setError: (address: string, error: string) => {
        // Initialize account entry if it doesn't exist
        if (!accountStore.accounts[address].peek()) {
            accountStore.accounts[address].set({
                data: null,
                extendedData: null,
                lastUpdated: Date.now(),
                isLoading: false,
                error: error
            });
        } else {
            accountStore.accounts[address].error.set(error);
            accountStore.accounts[address].isLoading.set(false);
        }
        notifyUpdate();
    },

    // Check if data is stale and needs refresh
    isDataStale: (address: string): boolean => {
        const accountData = accountStore.accounts[address].peek();
        if (!accountData) return true;

        const now = Date.now();
        return now - accountData.lastUpdated > ACCOUNT_DATA_CONFIG.MIN_FRESHNESS_MS;
    },

    // Force update
    forceUpdate: () => {
        notifyUpdate();
    }
}; 