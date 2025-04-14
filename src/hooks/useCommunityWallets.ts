import { useEffect, useRef, useState } from 'react';
// @ts-ignore
import type { AppStateStatus } from 'react-native';
// @ts-ignore
import { AppState } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { useSdkContext } from '../context/SdkContext';
import { communityWalletStore, communityWalletActions, CommunityWalletData, COMMUNITY_WALLET_CONFIG } from '../store/communityWalletStore';

interface UseCommunityWalletsResult {
    wallets: CommunityWalletData[];
    isLoading: boolean;
    error: string | null;
    refresh: (force?: boolean) => Promise<void>;
    isStale: boolean;
}

/**
 * Helper function to recursively unwrap observable values - adapted from AccountDetails
 */
function unwrapObservableValue<T>(value: any): T {
    // Handle undefined/null
    if (value === undefined || value === null) {
        return value as T;
    }

    // Handle observable with get() method
    if (typeof value === 'object' && value !== null && typeof value.get === 'function') {
        try {
            const unwrappedValue = value.get();
            // Recursively unwrap the result
            return unwrapObservableValue<T>(unwrappedValue);
        } catch (e) {
            console.warn('Error unwrapping observable with get():', e);
            return value as T;
        }
    }

    // Handle arrays
    if (Array.isArray(value)) {
        return value.map(item => unwrapObservableValue(item)) as any as T;
    }

    // Handle objects (but not functions or other special objects)
    if (
        typeof value === 'object' &&
        value !== null &&
        value.constructor === Object
    ) {
        const result: Record<string, any> = {};
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                result[key] = unwrapObservableValue(value[key]);
            }
        }
        return result as T;
    }

    // Return primitives and other values as is
    return value as T;
}

export const useCommunityWallets = (isVisible = true): UseCommunityWalletsResult => {
    const { sdk, isInitialized } = useSdkContext();
    const walletsObservable = useObservable(communityWalletStore.wallets);
    const isLoadingObservable = useObservable(communityWalletStore.isLoading);
    const errorObservable = useObservable(communityWalletStore.error);
    const [isStale, setIsStale] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const appState = useRef(AppState.currentState);
    const isMounted = useRef(true);

    // Set isMounted ref on mount/unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Handle app state changes (background/foreground)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active' && isVisible) {
                refreshData(true); // Force refresh when app comes to foreground
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [isVisible]);

    // Direct GitHub fetch as fallback
    const fetchWalletsFromGitHub = async () => {
        try {
            console.log('[useCommunityWallets] Fetching wallets directly from GitHub');
            const response = await fetch('https://raw.githubusercontent.com/0LNetworkCommunity/v7-addresses/refs/heads/main/community-wallets.json');

            if (!response.ok) {
                throw new Error(`GitHub API responded with status: ${response.status}`);
            }

            const data = await response.json();
            console.log('[useCommunityWallets] GitHub data received:', data);

            if (!data || !data.communityWallets) {
                throw new Error('Invalid data format from GitHub');
            }

            // Process wallet addresses from GitHub - use parallel processing for efficiency
            const updatePromises = Object.entries(data.communityWallets).map(async ([address, info]) => {
                try {
                    const normalizedAddress = address.toLowerCase().replace(/^0x0+/, '0x');

                    // Get account details from SDK
                    const accountData = await sdk?.getAccount(normalizedAddress);

                    // Extract balance from account data
                    let balance = 0;
                    if (accountData) {
                        if (typeof accountData.balance === 'number') {
                            balance = accountData.balance;
                        } else if (accountData.balance) {
                            balance = parseInt(String(accountData.balance), 10) || 0;
                        } else if (accountData.balances?.libra) {
                            balance = accountData.balances.libra;
                        }
                    }

                    // Create wallet data
                    const walletInfo = info as any;
                    const walletData: CommunityWalletData = {
                        address: normalizedAddress,
                        name: walletInfo.name || 'Community Wallet',
                        balance
                    };

                    // Update store - won't clear other entries
                    if (isMounted.current) {
                        console.log(`[useCommunityWallets] Adding wallet to store: ${normalizedAddress}`);
                        return communityWalletActions.updateWallet(normalizedAddress, walletData);
                    }
                    return false;
                } catch (error) {
                    console.error(`[useCommunityWallets] Error processing wallet ${address}:`, error);
                    return false;
                }
            });

            // Wait for all updates to complete
            await Promise.allSettled(updatePromises);
            return true;
        } catch (error) {
            console.error('[useCommunityWallets] Error fetching from GitHub:', error);
            if (isMounted.current) {
                communityWalletActions.setError('Failed to load community wallets');
            }
            return false;
        } finally {
            if (isMounted.current) {
                communityWalletActions.setLoading(false);
            }
        }
    };

    // Refresh function that triggers data fetch
    const refreshData = async (force = false): Promise<void> => {
        const now = Date.now();

        // Prevent rapid consecutive refreshes unless forced
        if (!force && now - lastFetchTime < COMMUNITY_WALLET_CONFIG.REFRESH_INTERVAL_MS) {
            return Promise.resolve();
        }

        if (!isInitialized || !sdk) {
            console.warn('[useCommunityWallets] SDK not initialized, cannot refresh wallets');
            if (isMounted.current) {
                communityWalletActions.setError('SDK not initialized');
            }
            return Promise.resolve();
        }

        if (isMounted.current) {
            console.log('[useCommunityWallets] Refreshing community wallet data');
            communityWalletActions.setLoading(true);
            communityWalletActions.setError(null);
            setLastFetchTime(now);
        }

        // Check if SDK has community wallet functions
        const hasSdkWalletFunctions =
            typeof sdk.getAllCommunityWallets === 'function' &&
            typeof sdk.getCommunityWalletNames === 'function';

        console.log(`[useCommunityWallets] SDK has wallet functions: ${hasSdkWalletFunctions}`);

        try {
            if (hasSdkWalletFunctions) {
                // Try SDK method first
                try {
                    const addresses = await sdk.getAllCommunityWallets();
                    console.log('[useCommunityWallets] SDK returned addresses:', addresses);

                    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
                        console.log('[useCommunityWallets] No addresses from SDK, falling back to GitHub');
                        await fetchWalletsFromGitHub();
                        return Promise.resolve();
                    }

                    const namesMap = await sdk.getCommunityWalletNames() || {};
                    console.log('[useCommunityWallets] SDK returned names map:', namesMap);

                    // Process each address
                    const updatePromises = addresses.map(async (address) => {
                        try {
                            const normalizedAddress = address.toLowerCase().replace(/^0x0+/, '0x');
                            const accountData = await sdk.getAccount(normalizedAddress);

                            // Extract balance
                            let balance = 0;
                            if (accountData) {
                                if (typeof accountData.balance === 'number') {
                                    balance = accountData.balance;
                                } else if (accountData.balance) {
                                    balance = parseInt(String(accountData.balance), 10) || 0;
                                } else if (accountData.balances?.libra) {
                                    balance = accountData.balances.libra;
                                }
                            }

                            // Get name from map
                            const name = namesMap[normalizedAddress] || 'Community Wallet';

                            // Create wallet data
                            const walletData: CommunityWalletData = {
                                address: normalizedAddress,
                                name,
                                balance
                            };

                            // Update store
                            if (isMounted.current) {
                                communityWalletActions.updateWallet(normalizedAddress, walletData);
                            }
                        } catch (error) {
                            console.error(`[useCommunityWallets] Error processing address ${address}:`, error);
                        }
                    });

                    // Wait for all updates to complete
                    await Promise.allSettled(updatePromises);
                } catch (sdkError) {
                    console.error('[useCommunityWallets] Error using SDK methods:', sdkError);
                    await fetchWalletsFromGitHub();
                }
            } else {
                // Fallback to GitHub
                await fetchWalletsFromGitHub();
            }
        } catch (error) {
            console.error('[useCommunityWallets] Error in refresh function:', error);
            if (isMounted.current) {
                communityWalletActions.setError('Failed to refresh community wallets');
            }
        } finally {
            if (isMounted.current) {
                communityWalletActions.setLoading(false);
                // Update stale status
                setIsStale(Date.now() - lastFetchTime > COMMUNITY_WALLET_CONFIG.MIN_FRESHNESS_MS);
            }
        }

        return Promise.resolve();
    };

    // Get an array of wallets with proper unwrapping of observables
    const getWalletsArray = (): CommunityWalletData[] => {
        const walletsRecord = unwrapObservableValue(walletsObservable);
        if (!walletsRecord || typeof walletsRecord !== 'object') {
            return [];
        }

        return Object.entries(walletsRecord)
            .filter(([_, wallet]) => {
                const unwrappedWallet = unwrapObservableValue(wallet) as { data: unknown; lastUpdated: number; } | null;
                return unwrappedWallet &&
                    typeof unwrappedWallet === 'object' &&
                    'data' in unwrappedWallet &&
                    unwrappedWallet.data;
            })
            .map(([_, wallet]) => {
                const unwrappedWallet = unwrapObservableValue(wallet) as { data: unknown; lastUpdated: number; };
                return unwrapObservableValue(unwrappedWallet.data) as CommunityWalletData;
            })
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    };

    // Initial fetch when the component becomes visible
    useEffect(() => {
        if (isVisible && isInitialized && sdk) {
            refreshData();
        }
    }, [isVisible, isInitialized, sdk]);

    // Set up polling for data refreshes
    useEffect(() => {
        if (!isVisible || !isInitialized || !sdk) {
            return;
        }

        const interval = setInterval(() => {
            refreshData();
        }, COMMUNITY_WALLET_CONFIG.REFRESH_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [isVisible, isInitialized, sdk]);

    return {
        wallets: getWalletsArray(),
        isLoading: unwrapObservableValue<boolean>(isLoadingObservable) || false,
        error: unwrapObservableValue<string | null>(errorObservable),
        refresh: refreshData,
        isStale
    };
}; 