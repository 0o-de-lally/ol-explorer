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

    // Get data from store using observables to track changes
    const accountData = address ? useObservable(accountStore.accounts[address]?.data) : null;
    const extendedData = address ? useObservable(accountStore.accounts[address]?.extendedData) : null;
    const isLoading = address ? useObservable(accountStore.accounts[address]?.isLoading) : false;
    const error = address ? useObservable(accountStore.accounts[address]?.error) : null;
    const lastUpdated = address ? useObservable(accountStore.accounts[address]?.lastUpdated) : 0;

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
            if (typeof sdk.ext_getAccountTransactions === 'function') {
                transactions = await sdk.ext_getAccountTransactions(address, 10);
            }
        } catch (error) {
            console.error(`Error fetching account transactions: ${error}`);
        }

        // Default values for extended data
        let voucherScore = 0;
        let isValidated = false;
        let isFounder = false;
        let hasFriends = false;
        let isDonorVoice = false;
        let isDAORoot = false;

        try {
            // Attempt to get vouch score if available
            const vouchView = {
                function: `${appConfig.network.OL_FRAMEWORK}::vouch_score::evaluate_users_vouchers`,
                typeArguments: [],
                arguments: [[appConfig.network.OL_FRAMEWORK], address]
            };
            try {
                voucherScore = await sdk.view(vouchView) || 0;
                console.log("Vouch score:", voucherScore);
                // If result is an array with a single value, get that value
                if (Array.isArray(voucherScore) && voucherScore.length > 0) {
                    voucherScore = voucherScore[0];
                }

                // Convert to number if it's a string
                if (typeof voucherScore === 'string') {
                    voucherScore = parseFloat(voucherScore);
                }

                // Ensure we have a valid number
                voucherScore = !isNaN(voucherScore) && typeof voucherScore === 'number' ? voucherScore : 0;
                console.log("Vouch score after processing:", voucherScore);
            } catch (error) {
                console.error("Error evaluating voucher score:", error);
            }

            // Determine if this is a validated account
            const validatedView = {
                function: `${appConfig.network.OL_FRAMEWORK}::vouch::is_voucher_score_valid`,
                typeArguments: [],
                arguments: [address]
            };
            try {
                isValidated = await sdk.view(validatedView) || false;
            } catch (error) {
                console.error("Error checking if account is validated:", error);
            }

            // Check if the account is a founder
            const founderView = {
                function: `${appConfig.network.OL_FRAMEWORK}::founder::is_founder`,
                typeArguments: [],
                arguments: [address]
            };
            try {
                isFounder = await sdk.view(founderView) || false;
            } catch (error) {
                console.error("Error checking founder status:", error);
            }

            // Check if has friends
            const friendsView = {
                function: `${appConfig.network.OL_FRAMEWORK}::founder::has_friends`,
                typeArguments: [],
                arguments: [address]
            };
            try {
                hasFriends = await sdk.view(friendsView) || false;
            } catch (error) {
                console.error("Error checking friends status:", error);
            }

            // Check if donor voice
            const donorView = {
                function: `${appConfig.network.OL_FRAMEWORK}::donor_voice::is_donor_voice`,
                typeArguments: [],
                arguments: [address]
            };
            try {
                isDonorVoice = await sdk.view(donorView) || false;
            } catch (error) {
                console.error("Error checking donor voice status:", error);
            }

            // Check if account is in the root registry
            const rootsView = {
                function: `${appConfig.network.OL_FRAMEWORK}::root_of_trust::get_current_roots_at_registry`,
                typeArguments: [],
                arguments: [`${appConfig.network.OL_FRAMEWORK}::donor_voice::DonorVoice`]
            };
            try {
                const roots = await sdk.view(rootsView) || [];
                isDAORoot = roots.includes(address);
            } catch (error) {
                console.error("Error checking root registry:", error);
            }
        } catch (error) {
            console.error("Error fetching extended account data:", error);
        }

        // Create and return properly structured extended data
        return {
            communityWallet: {
                isDonorVoice: isDonorVoice,
                isAuthorized: false, // Default
                isReauthProposed: false, // Default
                isInitialized: false, // Default
                isWithinAuthorizeWindow: false, // Default
                vetoTally: 0 // Default
            },
            founder: {
                isFounder: isFounder,
                hasFriends: hasFriends
            },
            vouching: {
                vouchScore: voucherScore,
                hasValidVouchScore: isValidated
            },
            activity: {
                hasBeenTouched: transactions.length > 0,
                onboardingTimestamp: 0, // Default
                lastActivityTimestamp: 0, // Default
                isInitializedOnV8: false // Default
            },
            validator: {
                isValidator: false, // Default
                currentBid: 0, // Default
                grade: { isCompliant: false, acceptedProposals: 0, failedProposals: 0 }, // Default
                jailReputation: 0, // Default
                countBuddiesJailed: 0 // Default
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

            // Fetch extended account data
            const extendedAccountData = await fetchExtendedAccountData(address);

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