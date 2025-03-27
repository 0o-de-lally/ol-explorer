import { useEffect } from 'react';
import { Account } from '../types/blockchain';
import { accountStore, accountActions } from '../store/accountStore';
import { useSdkContext } from '../context/SdkContext';
import { useObservable } from '@legendapp/state/react';
import { isValidAddressFormat } from '../utils/addressUtils';

interface UseAccountResult {
    account: Account | null;
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

    // Get data from store using observables to track changes
    const accountData = address ? useObservable(accountStore.accounts[address]?.data) : null;
    const isLoading = address ? useObservable(accountStore.accounts[address]?.isLoading) : false;
    const error = address ? useObservable(accountStore.accounts[address]?.error) : null;
    const lastUpdated = address ? useObservable(accountStore.accounts[address]?.lastUpdated) : 0;

    // Determine if data is stale
    const isStale = address ? accountActions.isDataStale(address) : false;

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

            if (!fetchedAccount) {
                throw new Error(`Account with address ${address} not found`);
            }

            // Validate the account data structure
            if (!fetchedAccount.address) {
                throw new Error('Account data missing address field');
            }

            // Ensure resources is always an array
            if (!fetchedAccount.resources) {
                console.warn(`Account resources is missing, setting empty array`);
                fetchedAccount.resources = [];
            } else if (!Array.isArray(fetchedAccount.resources)) {
                console.warn(`Account resources is not an array (${typeof fetchedAccount.resources}), setting empty array`);
                fetchedAccount.resources = [];
            }

            // Update account in store
            accountActions.setAccountData(address, fetchedAccount);
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
        isLoading: isLoading ? isLoading.get() : false,
        error: error ? (error.get() as unknown as string) : null,
        refresh: () => fetchAccount(true),
        isStale
    };
};