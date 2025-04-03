import { useEffect } from 'react';
import { Account } from '../types/blockchain';
import { accountStore, accountActions } from '../store/accountStore';
import { useSdkContext } from '../context/SdkContext';
import { useObservable } from '@legendapp/state/react';
import { isValidAddressFormat } from '../utils/addressUtils';
import { useSdk } from './useSdk';

// Extended Account interface with the additional data
interface ExtendedAccountData {
    communityWallet: {
        isDonorVoice: boolean;
        isAuthorized: boolean;
        isReauthProposed: boolean;
    };
    founder: {
        isFounder: boolean;
        hasFriends: boolean;
    };
    vouching: {
        vouchScore: number;
        hasValidVouchScore: boolean;
    };
}

interface UseAccountResult {
    account: Account | null;
    extendedData: ExtendedAccountData | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    isStale: boolean;
}

/**
 * Hook to get and manage account data for a specific address
 * 
 * @param address The account address to fetch data for
 * @returns Account data, loading state, and refresh function
 */
export const useAccount = (address: string | null): UseAccountResult => {
    const { sdk } = useSdkContext();
    const openLibraSdk = useSdk();

    // Get data from store using observables to track changes
    const accountData = address ? useObservable(accountStore.accounts[address]?.data) : null;
    const extendedData = address ? useObservable(accountStore.accounts[address]?.extendedData) : null;
    const isLoading = address ? useObservable(accountStore.accounts[address]?.isLoading) : false;
    const error = address ? useObservable(accountStore.accounts[address]?.error) : null;
    const lastUpdated = address ? useObservable(accountStore.accounts[address]?.lastUpdated) : 0;

    // Determine if data is stale
    const isStale = address ? accountActions.isDataStale(address) : false;

    // Function to fetch extended account data
    const fetchExtendedAccountData = async (accountAddress: string): Promise<ExtendedAccountData> => {
        console.log(`Fetching extended account data for ${accountAddress}`);

        // Initialize default extended data
        const extData: ExtendedAccountData = {
            communityWallet: {
                isDonorVoice: false,
                isAuthorized: false,
                isReauthProposed: false
            },
            founder: {
                isFounder: false,
                hasFriends: false
            },
            vouching: {
                vouchScore: 0,
                hasValidVouchScore: false
            }
        };

        try {
            console.log("Attempting to fetch community wallet status...");
            try {
                // Check if address is a Community Wallet
                extData.communityWallet.isDonorVoice = await openLibraSdk.isDonorVoice(accountAddress);

                // If it's a community wallet, check additional properties
                if (extData.communityWallet.isDonorVoice) {
                    extData.communityWallet.isAuthorized = await openLibraSdk.isDonorVoiceAuthorized(accountAddress);
                    extData.communityWallet.isReauthProposed = await openLibraSdk.isReauthProposed(accountAddress);
                }
            } catch (error) {
                console.warn("Error fetching community wallet status:", error);
                // Keep default values
            }

            console.log("Attempting to fetch founder status...");
            try {
                // Check if account is a founder
                extData.founder.isFounder = await openLibraSdk.isFounder(accountAddress);

                // If account is a founder, check if it has human friends
                if (extData.founder.isFounder) {
                    extData.founder.hasFriends = await openLibraSdk.hasFounderFriends(accountAddress);
                }
            } catch (error) {
                console.warn("Error fetching founder status:", error);
                // Keep default values
            }

            console.log("Attempting to fetch vouch score info...");
            try {
                // Get vouch score info
                extData.vouching.hasValidVouchScore = await openLibraSdk.isVoucherScoreValid(accountAddress);
                extData.vouching.vouchScore = await openLibraSdk.getVouchScore(accountAddress);
            } catch (error) {
                console.warn("Error fetching vouch score:", error);
                // Keep default values
            }

            return extData;
        } catch (error) {
            console.error(`Error fetching extended data for ${accountAddress}:`, error);
            // Return defaults if there's an error
            return extData;
        }
    };

    // Fetch account data
    const fetchAccount = async (force = false) => {
        if (!address || !sdk) return;

        // Check if we should fetch based on freshness
        if (!force && !accountActions.isDataStale(address)) {
            console.log(`Using cached account data for ${address}, still fresh`);
            return;
        }

        try {
            // Start loading
            accountActions.startLoading(address);

            // Validate address format
            if (!isValidAddressFormat(address)) {
                throw new Error(`Invalid address format: ${address}`);
            }

            // Fetch account data
            const fetchedAccount = await sdk.getAccount(address);

            // Log account data for debugging
            console.log('Account data received:', {
                address: fetchedAccount?.address,
                hasResources: !!fetchedAccount?.resources,
                resourcesType: fetchedAccount?.resources ? typeof fetchedAccount.resources : 'undefined',
                isArray: fetchedAccount?.resources ? Array.isArray(fetchedAccount.resources) : false,
                resourceCount: fetchedAccount?.resources && Array.isArray(fetchedAccount.resources)
                    ? fetchedAccount.resources.length
                    : 0
            });

            // NEW DETAILED DEBUG - Log the actual resources contents
            if (fetchedAccount?.resources) {
                console.log('DEBUG RESOURCES RAW:', {
                    isArray: Array.isArray(fetchedAccount.resources),
                    resourceCount: Array.isArray(fetchedAccount.resources) ? fetchedAccount.resources.length : 'not an array',
                    firstItem: Array.isArray(fetchedAccount.resources) && fetchedAccount.resources.length > 0
                        ? JSON.stringify(fetchedAccount.resources[0]).substring(0, 100) + '...'
                        : 'no items',
                    resourcesKeys: !Array.isArray(fetchedAccount.resources) && typeof fetchedAccount.resources === 'object'
                        ? Object.keys(fetchedAccount.resources)
                        : 'not an object'
                });
            }

            if (!fetchedAccount) {
                throw new Error(`Account with address ${address} not found`);
            }

            // Validate the account data structure
            if (!fetchedAccount.address) {
                throw new Error('Account data missing address field');
            }

            // BEFORE cleanup
            console.log('Resources BEFORE cleanup:', {
                hasResources: !!fetchedAccount.resources,
                resourcesType: typeof fetchedAccount.resources,
                isArray: Array.isArray(fetchedAccount.resources)
            });

            // Ensure resources is always an array
            if (!fetchedAccount.resources) {
                console.warn(`Account resources is missing, setting empty array`);
                fetchedAccount.resources = [];
            } else if (!Array.isArray(fetchedAccount.resources)) {
                console.warn(`Account resources is not an array (${typeof fetchedAccount.resources}), setting empty array`);

                // Try to convert if it's an object with values
                if (typeof fetchedAccount.resources === 'object' && fetchedAccount.resources !== null) {
                    try {
                        const values = Object.values(fetchedAccount.resources);
                        console.log(`Extracted ${values.length} resources from object`);
                        fetchedAccount.resources = values;
                    } catch (e) {
                        console.error('Failed to extract resources from object:', e);
                        fetchedAccount.resources = [];
                    }
                } else {
                    fetchedAccount.resources = [];
                }
            }

            // AFTER cleanup
            console.log('Resources AFTER cleanup:', {
                hasResources: !!fetchedAccount.resources,
                resourcesType: typeof fetchedAccount.resources,
                isArray: Array.isArray(fetchedAccount.resources),
                resourceCount: Array.isArray(fetchedAccount.resources) ? fetchedAccount.resources.length : 0
            });

            // Fetch extended account data
            const extendedAccountData = await fetchExtendedAccountData(address);
            console.log('Extended account data received:', extendedAccountData);

            // Update account in store
            accountActions.setAccountData(address, fetchedAccount);

            // Update extended data in store
            accountActions.setExtendedData(address, extendedAccountData);
        } catch (error) {
            console.error(`Error fetching account ${address}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            accountActions.setError(address, errorMessage);
        }
    };

    // Initial fetch on mount or address change
    useEffect(() => {
        if (address) {
            fetchAccount();
        }
    }, [address, sdk]);

    return {
        account: accountData?.get() || null,
        extendedData: extendedData?.get() || null,
        isLoading: isLoading ? isLoading.get() : false,
        error: error ? (error.get() as unknown as string) : null,
        refresh: () => fetchAccount(true),
        isStale
    };
};