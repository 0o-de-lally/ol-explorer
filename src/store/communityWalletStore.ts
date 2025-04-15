import { observable } from '@legendapp/state';
import appConfig from '../config/appConfig';
import { normalizeAddress } from '../utils/addressUtils';
import { BlockchainSDK } from '../types/blockchain';

// Debug flag - set to false in production
const DEBUG = false;

// A safe logging function that only logs in debug mode
const debugLog = (message: string, ...args: any[]) => {
    if (DEBUG) {
        console.log(`[CommunityWalletStore] ${message}`, ...args);
    }
};

// Config for data freshness
export const COMMUNITY_WALLET_CONFIG = {
    MIN_FRESHNESS_MS: 30000, // 30 seconds
    REFRESH_INTERVAL_MS: 60000 // 1 minute
};

// Define wallet data interface
export interface CommunityWalletData {
    address: string;
    name: string;
    balance: number;
}

// Define the store structure with record pattern
export interface CommunityWalletStoreType {
    wallets: Record<string, {
        data: CommunityWalletData | null;
        lastUpdated: number;
    }>;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number;
    lastForceUpdate: number;
}

// Initialize the store with default values
export const communityWalletStore = observable<CommunityWalletStoreType>({
    wallets: {},
    isLoading: false,
    error: null,
    lastUpdated: 0,
    lastForceUpdate: 0
});

// Function to notify global state updates
const notifyUpdate = () => {
    // Update lastUpdated timestamp to trigger reactivity
    communityWalletStore.set(prev => ({
        ...prev,
        lastUpdated: Date.now()
    }));

    // If we're in a browser environment, dispatch event for components
    if (typeof window !== 'undefined') {
        const event = new CustomEvent('community-wallets-updated', {
            detail: { timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }
};

// Store actions for updating state
export const communityWalletActions = {
    updateWallet: (address: string, data: CommunityWalletData) => {
        const now = Date.now();

        // Ensure the wallet entry exists before updating
        if (!communityWalletStore.wallets[address].peek()) {
            communityWalletStore.wallets[address].set({
                data: data,
                lastUpdated: now
            });
        } else {
            // Update existing data
            communityWalletStore.wallets[address].data.set(data);
            communityWalletStore.wallets[address].lastUpdated.set(now);
        }

        // Update last updated time
        communityWalletStore.lastUpdated.set(now);

        // Notify listeners
        notifyUpdate();

        return true;
    },
    setLoading: (isLoading: boolean) => {
        communityWalletStore.isLoading.set(isLoading);
        notifyUpdate();
    },
    setError: (error: string | null) => {
        communityWalletStore.error.set(error);
        notifyUpdate();
    },
    forceUpdate: () => {
        const now = Date.now();
        communityWalletStore.lastForceUpdate.set(now);
        communityWalletStore.lastUpdated.set(now);
        notifyUpdate();
        return true;
    },
    isDataStale: () => {
        const lastUpdate = communityWalletStore.lastUpdated.get();
        return Date.now() - lastUpdate > COMMUNITY_WALLET_CONFIG.MIN_FRESHNESS_MS;
    },
    isWalletDataStale: (address: string) => {
        const walletData = communityWalletStore.wallets[address].get();
        if (!walletData || !walletData.lastUpdated) return true;
        return Date.now() - walletData.lastUpdated > COMMUNITY_WALLET_CONFIG.MIN_FRESHNESS_MS;
    }
};

// Initialize the wallet data store
export const fetchCommunityWallets = async (sdk: any) => {
    debugLog('Fetching community wallets');
    communityWalletActions.setLoading(true);
    communityWalletActions.setError(null);

    try {
        // Check if SDK has required functions
        const hasAllWalletsFn = typeof sdk.getAllCommunityWallets === 'function';
        const hasNamesFn = typeof sdk.getCommunityWalletNames === 'function';

        // Get all wallet addresses from the blockchain (if supported)
        let walletAddresses: string[] = [];
        if (hasAllWalletsFn) {
            walletAddresses = await sdk.getAllCommunityWallets();
        } else {
            if (DEBUG) console.warn('getAllCommunityWallets not available in SDK');
        }
        debugLog(`Found ${walletAddresses.length} wallet addresses`);

        // Get wallet names from GitHub repository (if supported)
        let walletNames: Record<string, string> = {};
        if (hasNamesFn) {
            walletNames = await sdk.getCommunityWalletNames() || {};
        } else {
            if (DEBUG) console.warn('getCommunityWalletNames not available in SDK');
        }
        debugLog(`Found ${Object.keys(walletNames).length} wallet names`);

        // Parallel fetch of wallet data using Promise.allSettled for error handling
        const results = await Promise.allSettled(
            walletAddresses.map(async (address: string) => {
                try {
                    const normalizedAddress = normalizeAddress(address);
                    debugLog(`Fetching data for wallet: ${normalizedAddress}`);

                    // Get the account data from the SDK
                    const accountData = await sdk.getAccount(normalizedAddress);

                    // Extract balance from account data
                    let balance = 0;
                    if (accountData) {
                        if (accountData.balance) {
                            balance = typeof accountData.balance === 'number'
                                ? accountData.balance
                                : parseInt(accountData.balance, 10) || 0;
                        } else if (accountData.balances && accountData.balances.libra) {
                            balance = accountData.balances.libra;
                        }
                    }

                    // Get the wallet name from the GitHub data
                    const name = walletNames[normalizedAddress] || 'Community Wallet';

                    debugLog(`Wallet ${normalizedAddress}: name=${name}, balance=${balance}`);

                    return {
                        address: normalizedAddress,
                        name,
                        balance
                    };
                } catch (error) {
                    if (DEBUG) console.error(`Error fetching data for wallet ${address}`, error);
                    throw error;
                }
            })
        );

        debugLog(`Processed ${results.length} wallets`);

        // Process the results of the parallel fetch
        let successCount = 0;
        for (const result of results) {
            if (result.status === 'fulfilled') {
                const walletData = result.value;
                communityWalletActions.updateWallet(walletData.address, walletData);
                successCount++;
            }
            // Errors are already logged in the map function
        }

        debugLog(`Successfully updated ${successCount} of ${results.length} wallets`);

        // Update the store with the results
        communityWalletActions.setLoading(false);
        communityWalletActions.setError(null);
        communityWalletActions.forceUpdate();

        return true;
    } catch (error) {
        console.error('Error fetching community wallets', error);
        communityWalletActions.setError('Failed to load community wallets');
        communityWalletActions.setLoading(false);
        return false;
    }
}; 