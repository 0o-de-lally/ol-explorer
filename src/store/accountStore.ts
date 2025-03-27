import { observable } from '@legendapp/state';
import { Account } from '../types/blockchain';

// Config for data freshness
export const ACCOUNT_DATA_CONFIG = {
    // Minimum freshness in milliseconds (10 seconds)
    MIN_FRESHNESS_MS: 10000,
    // Auto-refresh interval in milliseconds (30 seconds)
    REFRESH_INTERVAL_MS: 30000
};

// Define the account store structure
export interface AccountStoreType {
    accounts: Record<string, {
        data: Account | null;
        lastUpdated: number;
        isLoading: boolean;
        error: string | null;
    }>;
    activeAddress: string | null;
}

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

    setAccountData: (address: string, account: Account | null) => {
        // Validate account data
        if (account) {
            // Ensure required fields exist
            if (!account.address) {
                console.error('Account data missing address field');
                account.address = address;
            }

            // Ensure resources is always an array
            if (!account.resources) {
                account.resources = [];
            } else if (!Array.isArray(account.resources)) {
                console.warn(`Account resources is not an array, fixing it`);
                account.resources = [];
            }
        }

        // Initialize account entry if it doesn't exist
        if (!accountStore.accounts[address].peek()) {
            accountStore.accounts[address].set({
                data: account,
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

    setError: (address: string, error: string) => {
        // Initialize account entry if it doesn't exist
        if (!accountStore.accounts[address].peek()) {
            accountStore.accounts[address].set({
                data: null,
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