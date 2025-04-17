import { useEffect } from 'react';
import { Account, AccountResource } from '../types/blockchain';
import { accountStore, accountActions, ExtendedAccountData } from '../store/accountStore';
import { useSdkContext } from '../context/SdkContext';
import { useObservable } from '@legendapp/state/react';
import { isValidAddressFormat } from '../utils/addressUtils';
import { useSdk } from './useSdk';
import { ValidatorGrade } from './useSdk';
import appConfig from '../config/appConfig';

// Extended Account interface with the additional data

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

    // Get data from store using observables to track changes - always call hooks unconditionally
    const accountDataObservable = useObservable(address ? accountStore.accounts[address]?.data : null);
    const extendedDataObservable = useObservable(address ? accountStore.accounts[address]?.extendedData : null);
    const isLoadingObservable = useObservable(address ? accountStore.accounts[address]?.isLoading : false);
    const errorObservable = useObservable(address ? accountStore.accounts[address]?.error : null);
    const lastUpdatedObservable = useObservable(address ? accountStore.accounts[address]?.lastUpdated : 0);
    const _lastUpdated = lastUpdatedObservable?.get(); // Handle unused variable warning

    // Determine if data is stale
    const isStale = address ? accountActions.isDataStale(address) : false;

    // Function to fetch extended account data
    const fetchExtendedAccountData = async (address: string, account: Account, resources: AccountResource[]): Promise<ExtendedAccountData> => {
        if (!sdk) {
            // Return default ExtendedAccountData structure when no SDK
            return {
                communityWallet: {
                    isDonorVoice: false,
                    isAuthorized: false,
                    isReauthProposed: false,
                    isInitialized: false,
                    isWithinAuthorizeWindow: false,
                    vetoTally: 0
                },
                founder: {
                    isFounder: false,
                    hasFriends: false
                },
                vouching: {
                    vouchScore: 0,
                    hasValidVouchScore: false
                },
                activity: {
                    hasBeenTouched: false,
                    onboardingTimestamp: 0,
                    lastActivityTimestamp: 0,
                    isInitializedOnV8: false
                },
                validator: {
                    isValidator: false,
                    currentBid: [0, 0],
                    grade: { isCompliant: false, acceptedProposals: 0, failedProposals: 0 },
                    jailReputation: 0,
                    countBuddiesJailed: 0,
                    isJailed: false
                },
                accountType: {
                    isRegularWallet: true,
                    isSlowWallet: false,
                    isValidatorWallet: false,
                    isCommunityWallet: false,
                    isV8Authorized: false
                }
            };
        }

        try {
            // Check if account is a validator
            const isInValidatorUniverse = await openLibraSdk.isInValidatorUniverse(address);
            // Get validator data if it's a validator
            const currentBid = await openLibraSdk.getCurrentBid(address);
            const validatorGrade = await openLibraSdk.getValidatorGrade(address);
            const jailReputation = await openLibraSdk.getJailReputation(address);
            const countBuddiesJailed = await openLibraSdk.getCountBuddiesJailed(address);
            const isJailed = await openLibraSdk.isJailed(address);

            // Check if account is a community wallet (donor voice)
            const isDonorVoice = await openLibraSdk.isDonorVoice(address);
            // Get community wallet data
            const isAuthorized = await openLibraSdk.isDonorVoiceAuthorized(address);
            const isReauthProposed = await openLibraSdk.isReauthProposed(address);
            const isCommunityWalletInit = await openLibraSdk.isCommunityWalletInit(address);
            const isWithinAuthorizeWindow = await openLibraSdk.isWithinAuthorizeWindow(address);
            const vetoTally = await openLibraSdk.getVetoTally(address);

            // Check if account is a slow wallet
            const isSlowWallet = await openLibraSdk.isSlowWallet(address);
            // No specific slow wallet data fetching needed here

            // Check if account has verified account status (founder, etc.)
            const isFounder = await openLibraSdk.isFounder(address);
            const hasFriends = await openLibraSdk.hasFounderFriends(address);
            const hasValidVouchScore = await openLibraSdk.isVoucherScoreValid(address);
            const vouchScore = await openLibraSdk.getVouchScore(address);

            // Get activity data
            const hasBeenTouched = await openLibraSdk.hasEverBeenTouched(address);
            const onboardingTimestamp = await openLibraSdk.getOnboardingUsecs(address);
            const lastActivityTimestamp = await openLibraSdk.getLastActivityUsecs(address);
            const isInitializedOnV8 = await openLibraSdk.isInitializedOnV8(address);
            const isV8Authorized = await openLibraSdk.isV8Authorized(address);

            // Reauth data if available
            const reauthTally = await openLibraSdk.getReauthTally(address);
            const reauthDeadline = await openLibraSdk.getReauthDeadline(address);
            const isLiquidationProposed = await openLibraSdk.isLiquidationProposed(address);

            // Create the extended account data object
            return {
                communityWallet: {
                    isDonorVoice,
                    isAuthorized,
                    isReauthProposed,
                    isInitialized: isCommunityWalletInit,
                    isWithinAuthorizeWindow,
                    vetoTally
                },
                founder: {
                    isFounder,
                    hasFriends
                },
                vouching: {
                    vouchScore,
                    hasValidVouchScore
                },
                activity: {
                    hasBeenTouched,
                    onboardingTimestamp,
                    lastActivityTimestamp,
                    isInitializedOnV8
                },
                validator: {
                    isValidator: isInValidatorUniverse,
                    currentBid,
                    grade: validatorGrade,
                    jailReputation,
                    countBuddiesJailed,
                    isJailed
                },
                accountType: {
                    isRegularWallet: !isDonorVoice && !isSlowWallet && !isInValidatorUniverse,
                    isSlowWallet,
                    isValidatorWallet: isInValidatorUniverse,
                    isCommunityWallet: isDonorVoice,
                    isV8Authorized
                },
                // Include optional fields if applicable
                reauth: {
                    isReauthProposed,
                    reauthTally,
                    reauthDeadline,
                    isLiquidationProposed
                }
            };
        } catch (error) {
            console.error(`Error fetching extended account data for ${address}:`, error);

            // Return default data in case of error
            return {
                communityWallet: {
                    isDonorVoice: false,
                    isAuthorized: false,
                    isReauthProposed: false,
                    isInitialized: false,
                    isWithinAuthorizeWindow: false,
                    vetoTally: 0
                },
                founder: {
                    isFounder: false,
                    hasFriends: false
                },
                vouching: {
                    vouchScore: 0,
                    hasValidVouchScore: false
                },
                activity: {
                    hasBeenTouched: false,
                    onboardingTimestamp: 0,
                    lastActivityTimestamp: 0,
                    isInitializedOnV8: false
                },
                validator: {
                    isValidator: false,
                    currentBid: [0, 0],
                    grade: { isCompliant: false, acceptedProposals: 0, failedProposals: 0 },
                    jailReputation: 0,
                    countBuddiesJailed: 0,
                    isJailed: false
                },
                accountType: {
                    isRegularWallet: true,
                    isSlowWallet: false,
                    isValidatorWallet: false,
                    isCommunityWallet: false,
                    isV8Authorized: false
                }
            };
        }
    };

    // Simplified fetchAccount function with minimal data manipulation
    const fetchAccount = async (force = false) => {
        if (!address || !sdk) return;

        // Skip fetch if data is fresh enough
        if (!force && !accountActions.isDataStale(address)) {
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

            if (!fetchedAccount) {
                throw new Error(`Account with address ${address} not found`);
            }

            // Validate the account data structure
            if (!fetchedAccount.address) {
                throw new Error('Account data missing address field');
            }

            // Minimal handling - only create empty array if null/undefined
            if (fetchedAccount.resources === null || fetchedAccount.resources === undefined) {
                fetchedAccount.resources = [];
            }

            // Fetch balance information using the new SDK method
            const [unlocked, total] = await openLibraSdk.getAccountBalance(address);

            // Get resources for extended account data
            let resources: AccountResource[] = Array.isArray(fetchedAccount.resources)
                ? fetchedAccount.resources
                : [];

            // Fetch extended account data with necessary resources
            const extendedAccountData = await fetchExtendedAccountData(address, fetchedAccount, resources);

            // Update account in store with balance information
            accountActions.setAccountData(address, fetchedAccount, {
                unlocked,
                total
            });

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
        account: accountDataObservable?.get ? (accountDataObservable.get() as Account | null) : null,
        extendedData: extendedDataObservable?.get ? (extendedDataObservable.get() as ExtendedAccountData | null) : null,
        isLoading: isLoadingObservable ? Boolean(isLoadingObservable.get()) : false,
        error: errorObservable ? (errorObservable.get() as unknown as string) : null,
        refresh: () => fetchAccount(true),
        isStale
    };
};