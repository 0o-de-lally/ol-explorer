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
            // First, get activity and authorization data which applies to all accounts
            const hasBeenTouched = await openLibraSdk.hasEverBeenTouched(address);
            const isInitializedOnV8 = await openLibraSdk.isInitializedOnV8(address);
            const isV8Authorized = await openLibraSdk.isV8Authorized(address);

            // Next, determine account type - this will guide which additional data we fetch
            const isDonorVoice = await openLibraSdk.isDonorVoice(address);
            const isSlowWallet = await openLibraSdk.isSlowWallet(address);
            const isInValidatorUniverse = await openLibraSdk.isInValidatorUniverse(address);

            // Determine the account type based on the checks
            const accountType = {
                isRegularWallet: !isDonorVoice && !isSlowWallet && !isInValidatorUniverse,
                isSlowWallet: isSlowWallet,
                isValidatorWallet: isInValidatorUniverse,
                isCommunityWallet: isDonorVoice,
                isV8Authorized: isV8Authorized
            };

            // Initialize data structure with common fields
            const extendedData: ExtendedAccountData = {
                accountType,
                activity: {
                    hasBeenTouched,
                    onboardingTimestamp: 0, // Will be populated conditionally
                    lastActivityTimestamp: 0, // Will be populated conditionally
                    isInitializedOnV8
                },
                founder: {
                    isFounder: false,
                    hasFriends: false
                },
                vouching: {
                    vouchScore: 0,
                    hasValidVouchScore: false
                },
                validator: {
                    isValidator: isInValidatorUniverse,
                    currentBid: [0, 0],
                    grade: { isCompliant: false, acceptedProposals: 0, failedProposals: 0 },
                    jailReputation: 0,
                    countBuddiesJailed: 0,
                    isJailed: false
                },
                communityWallet: {
                    isDonorVoice,
                    isAuthorized: false,
                    isReauthProposed: false,
                    isInitialized: false,
                    isWithinAuthorizeWindow: false,
                    vetoTally: 0
                }
            };

            // Fetch additional data based on account type

            // For all account types, fetch activity data if they've been touched
            if (hasBeenTouched) {
                const onboardingTimestamp = await openLibraSdk.getOnboardingUsecs(address);
                const lastActivityTimestamp = await openLibraSdk.getLastActivityUsecs(address);
                extendedData.activity.onboardingTimestamp = onboardingTimestamp;
                extendedData.activity.lastActivityTimestamp = lastActivityTimestamp;

                // Check founder status for all accounts except community wallets
                if (!isDonorVoice) {
                    const isFounder = await openLibraSdk.isFounder(address);
                    if (isFounder) {
                        const hasFriends = await openLibraSdk.hasFounderFriends(address);
                        extendedData.founder.isFounder = isFounder;
                        extendedData.founder.hasFriends = hasFriends;
                    }

                    // Check vouching score for all accounts except community wallets
                    const hasValidVouchScore = await openLibraSdk.isVoucherScoreValid(address);
                    if (hasValidVouchScore) {
                        const vouchScore = await openLibraSdk.getVouchScore(address);
                        extendedData.vouching.vouchScore = vouchScore;
                    }
                    extendedData.vouching.hasValidVouchScore = hasValidVouchScore;
                }
            }

            // Fetch data specific to community wallets
            if (isDonorVoice) {
                const isAuthorized = await openLibraSdk.isDonorVoiceAuthorized(address);
                const isWithinAuthorizeWindow = await openLibraSdk.isWithinAuthorizeWindow(address);
                const isCommunityWalletInit = await openLibraSdk.isCommunityWalletInit(address);
                const vetoTally = await openLibraSdk.getVetoTally(address);

                extendedData.communityWallet = {
                    isDonorVoice,
                    isAuthorized,
                    isReauthProposed: false, // Will check conditionally
                    isInitialized: isCommunityWalletInit,
                    isWithinAuthorizeWindow,
                    vetoTally
                };

                // Only check reauth status if not authorized
                if (!isAuthorized) {
                    const isReauthProposed = await openLibraSdk.isReauthProposed(address);
                    extendedData.communityWallet.isReauthProposed = isReauthProposed;

                    // Only fetch additional reauth data if a reauth proposal exists
                    if (isReauthProposed) {
                        const reauthTally = await openLibraSdk.getReauthTally(address);
                        const reauthDeadline = await openLibraSdk.getReauthDeadline(address);
                        const isLiquidationProposed = await openLibraSdk.isLiquidationProposed(address);

                        extendedData.reauth = {
                            isReauthProposed,
                            reauthTally,
                            reauthDeadline,
                            isLiquidationProposed
                        };
                    }
                }
            }

            // Fetch data specific to slow wallets
            if (isSlowWallet) {
                const unlockedAmount = await openLibraSdk.view({
                    function: `${appConfig.network.OL_FRAMEWORK}::slow_wallet::unlocked_amount`,
                    typeArguments: [],
                    arguments: [address]
                }) as string;

                const transferredAmount = await openLibraSdk.view({
                    function: `${appConfig.network.OL_FRAMEWORK}::slow_wallet::transferred_amount`,
                    typeArguments: [],
                    arguments: [address]
                }) as string;

                extendedData.slowWallet = {
                    unlockedAmount: String(unlockedAmount || "0"),
                    transferredAmount: String(transferredAmount || "0")
                };
            }

            // Fetch data specific to validator wallets
            if (isInValidatorUniverse) {
                const currentValidators = await openLibraSdk.getCurrentValidators();
                const isInCurrentValidators = currentValidators.some(
                    v => v.toLowerCase() === address.toLowerCase()
                );

                if (isInCurrentValidators) {
                    const validatorGrade = await openLibraSdk.getValidatorGrade(address);
                    extendedData.validator.grade = validatorGrade;
                }

                const currentBid = await openLibraSdk.getCurrentBid(address);
                const jailReputation = await openLibraSdk.getJailReputation(address);
                const countBuddiesJailed = await openLibraSdk.getCountBuddiesJailed(address);
                const isJailed = await openLibraSdk.isJailed(address);

                extendedData.validator = {
                    isValidator: isInValidatorUniverse,
                    currentBid,
                    grade: extendedData.validator.grade,
                    jailReputation,
                    countBuddiesJailed,
                    isJailed
                };

                // Fetch epoch boundary data for validator accounts
                try {
                    const bidders = await openLibraSdk.getBidders();
                    const maxSeats = await openLibraSdk.getMaxSeatsOffered();
                    const filledSeats = await openLibraSdk.getFilledSeats();

                    // Check if this account is in the bidders list
                    const isBidding = bidders.some(
                        bidder => bidder.toLowerCase() === address.toLowerCase()
                    );

                    extendedData.epoch = {
                        bidders,
                        maxSeats,
                        filledSeats,
                        isBidding
                    };
                } catch (error) {
                    console.error(`Error fetching epoch boundary data for ${address}:`, error);
                    // Provide default epoch data
                    extendedData.epoch = {
                        bidders: [],
                        maxSeats: 0,
                        filledSeats: 0,
                        isBidding: false
                    };
                }
            }

            return extendedData;

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