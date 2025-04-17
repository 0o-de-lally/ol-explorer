import { useEffect } from 'react';
import { Account, AccountResource } from '../types/blockchain';
import { accountStore, accountActions } from '../store/accountStore';
import { useSdkContext } from '../context/SdkContext';
import { useObservable } from '@legendapp/state/react';
import { isValidAddressFormat } from '../utils/addressUtils';
import { useSdk } from './useSdk';
import { ValidatorGrade } from './useSdk';
import appConfig from '../config/appConfig';

// Extended Account interface with the additional data
interface ExtendedAccountData {
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
    const fetchExtendedAccountData = async (address: string): Promise<ExtendedAccountData> => {
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
                    currentBid: 0,
                    grade: { isCompliant: false, acceptedProposals: 0, failedProposals: 0 },
                    jailReputation: 0,
                    countBuddiesJailed: 0
                }
            };
        }

        // Get account transactions for the account
        let transactions: any[] = [];
        try {
            // Use ext_getAccountTransactions if available for better performance
            transactions = await openLibraSdk.ext_getAccountTransactions(address, 10);
        } catch (error) {
            console.error(`Error fetching account transactions: ${error}`);
        }

        // Default values for extended data
        let voucherScore = 0;
        let isValidated = false;
        let isFounder = false;
        let hasFriends = false;
        let isDonorVoice = false;
        let isInitializedOnV8 = false;
        let onboardingTimestamp = 0;
        let lastActivityTimestamp = 0;
        let isValidator = false;
        let currentBid = 0;
        let validatorGrade = { isCompliant: false, acceptedProposals: 0, failedProposals: 0 };
        let jailReputation = 0;
        let countBuddiesJailed = 0;

        // Use Promise.allSettled to fetch all data in parallel and handle errors individually
        const results = await Promise.allSettled([
            // Vouching data
            openLibraSdk.getVouchScore(address),
            openLibraSdk.isVoucherScoreValid(address),

            // Founder data
            openLibraSdk.isFounder(address),
            openLibraSdk.hasFounderFriends(address),

            // Community wallet data
            openLibraSdk.isDonorVoice(address),

            // Activity data
            openLibraSdk.hasEverBeenTouched(address),
            openLibraSdk.isInitializedOnV8(address),
            openLibraSdk.getOnboardingUsecs(address),
            openLibraSdk.getLastActivityUsecs(address),

            // Validator data - first get the list to check if this account is a validator
            openLibraSdk.getCurrentValidators()
        ]);

        // Process results
        if (results[0].status === 'fulfilled') {
            voucherScore = results[0].value;
        }

        if (results[1].status === 'fulfilled') {
            isValidated = results[1].value;
        }

        if (results[2].status === 'fulfilled') {
            isFounder = results[2].value;
        }

        if (results[3].status === 'fulfilled') {
            hasFriends = results[3].value;
        }

        if (results[4].status === 'fulfilled') {
            isDonorVoice = results[4].value;
        }

        if (results[5].status === 'fulfilled') {
            // We already have transactions, but this is a more direct check
            const hasTouched = results[5].value;
            // Use the result only if we don't have transactions
            if (!transactions.length) {
                transactions = hasTouched ? [{}] : [];
            }
        }

        if (results[6].status === 'fulfilled') {
            isInitializedOnV8 = results[6].value;
        }

        if (results[7].status === 'fulfilled') {
            onboardingTimestamp = results[7].value;
        }

        if (results[8].status === 'fulfilled') {
            lastActivityTimestamp = results[8].value;
        }

        // Check if account is a validator
        if (results[9].status === 'fulfilled') {
            const validators = results[9].value;
            const normalizedAddress = address.toLowerCase();

            // Check if the address is in the validators list
            isValidator = validators.some(val =>
                typeof val === 'string' && val.toLowerCase() === normalizedAddress
            );

            // If this is a validator, get additional information
            if (isValidator) {
                // Use Promise.allSettled again for validator-specific data
                const validatorResults = await Promise.allSettled([
                    openLibraSdk.getCurrentBid(address),
                    openLibraSdk.getValidatorGrade(address),
                    openLibraSdk.getJailReputation(address),
                    openLibraSdk.getCountBuddiesJailed(address)
                ]);

                if (validatorResults[0].status === 'fulfilled') {
                    currentBid = validatorResults[0].value;
                }

                if (validatorResults[1].status === 'fulfilled') {
                    validatorGrade = validatorResults[1].value;
                }

                if (validatorResults[2].status === 'fulfilled') {
                    jailReputation = validatorResults[2].value;
                }

                if (validatorResults[3].status === 'fulfilled') {
                    countBuddiesJailed = validatorResults[3].value;
                }
            }
        }

        // Get community wallet detailed data if this is a donor voice
        let isAuthorized = false;
        let isReauthProposed = false;
        let isInitialized = false;
        let isWithinAuthorizeWindow = false;
        let vetoTally = 0;

        if (isDonorVoice) {
            // Fetch community wallet specific data
            const communityWalletResults = await Promise.allSettled([
                openLibraSdk.isDonorVoiceAuthorized(address),
                openLibraSdk.isReauthProposed(address),
                openLibraSdk.isCommunityWalletInit(address),
                openLibraSdk.isWithinAuthorizeWindow(address),
                openLibraSdk.getVetoTally(address)
            ]);

            if (communityWalletResults[0].status === 'fulfilled') {
                isAuthorized = communityWalletResults[0].value;
            }

            if (communityWalletResults[1].status === 'fulfilled') {
                isReauthProposed = communityWalletResults[1].value;
            }

            if (communityWalletResults[2].status === 'fulfilled') {
                isInitialized = communityWalletResults[2].value;
            }

            if (communityWalletResults[3].status === 'fulfilled') {
                isWithinAuthorizeWindow = communityWalletResults[3].value;
            }

            if (communityWalletResults[4].status === 'fulfilled') {
                vetoTally = communityWalletResults[4].value;
            }
        }

        // Create and return properly structured extended data
        return {
            communityWallet: {
                isDonorVoice,
                isAuthorized,
                isReauthProposed,
                isInitialized,
                isWithinAuthorizeWindow,
                vetoTally
            },
            founder: {
                isFounder,
                hasFriends
            },
            vouching: {
                vouchScore: voucherScore,
                hasValidVouchScore: isValidated
            },
            activity: {
                hasBeenTouched: transactions.length > 0,
                onboardingTimestamp,
                lastActivityTimestamp,
                isInitializedOnV8
            },
            validator: {
                isValidator,
                currentBid,
                grade: validatorGrade,
                jailReputation,
                countBuddiesJailed
            }
        };
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

            // Fetch extended account data
            const extendedAccountData = await fetchExtendedAccountData(address);

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