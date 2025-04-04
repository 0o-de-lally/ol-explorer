import { useEffect } from 'react';
import { Account, AccountResource } from '../types/blockchain';
import { accountStore, accountActions } from '../store/accountStore';
import { useSdkContext } from '../context/SdkContext';
import { useObservable } from '@legendapp/state/react';
import { isValidAddressFormat } from '../utils/addressUtils';
import { useSdk } from './useSdk';
import { ValidatorGrade } from './useSdk';

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
    const fetchExtendedAccountData = async (accountAddress: string): Promise<ExtendedAccountData> => {
        console.log(`Fetching extended account data for ${accountAddress}`);

        // Initialize default extended data
        const extData: ExtendedAccountData = {
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

        try {
            // Activity Status
            console.log("Fetching activity status...");
            try {
                extData.activity.hasBeenTouched = await openLibraSdk.hasEverBeenTouched(accountAddress);

                if (extData.activity.hasBeenTouched) {
                    // Only fetch these if the account has been touched

                    // Get onboarding timestamp - extract from array if needed
                    const onboardingTimestampResult = await openLibraSdk.getOnboardingUsecs(accountAddress);
                    console.log("Raw onboarding timestamp result:", onboardingTimestampResult);

                    if (Array.isArray(onboardingTimestampResult) && onboardingTimestampResult.length > 0) {
                        // Extract value from array
                        const timestampValue = onboardingTimestampResult[0];
                        extData.activity.onboardingTimestamp = typeof timestampValue === 'string'
                            ? parseInt(timestampValue, 10)
                            : timestampValue;
                    } else if (typeof onboardingTimestampResult === 'string') {
                        extData.activity.onboardingTimestamp = parseInt(onboardingTimestampResult, 10);
                    } else {
                        extData.activity.onboardingTimestamp = onboardingTimestampResult;
                    }
                    console.log("Processed onboarding timestamp:", extData.activity.onboardingTimestamp);

                    // Get last activity timestamp - extract from array if needed
                    const lastActivityTimestampResult = await openLibraSdk.getLastActivityUsecs(accountAddress);
                    console.log("Raw last activity timestamp result:", lastActivityTimestampResult);

                    if (Array.isArray(lastActivityTimestampResult) && lastActivityTimestampResult.length > 0) {
                        // Extract value from array
                        const timestampValue = lastActivityTimestampResult[0];
                        extData.activity.lastActivityTimestamp = typeof timestampValue === 'string'
                            ? parseInt(timestampValue, 10)
                            : timestampValue;
                    } else if (typeof lastActivityTimestampResult === 'string') {
                        extData.activity.lastActivityTimestamp = parseInt(lastActivityTimestampResult, 10);
                    } else {
                        extData.activity.lastActivityTimestamp = lastActivityTimestampResult;
                    }
                    console.log("Processed last activity timestamp:", extData.activity.lastActivityTimestamp);

                    // Check if initialized on V8
                    extData.activity.isInitializedOnV8 = await openLibraSdk.isInitializedOnV8(accountAddress);
                }
            } catch (error) {
                console.warn("Error fetching activity status:", error);
            }

            // Validator Status
            console.log("Fetching validator status...");
            try {
                // Get list of current validators
                const validators = await openLibraSdk.getCurrentValidators();
                console.log("Received validators list:", validators);

                // Try to detect if the response is a concatenated string instead of individual addresses
                if (validators.length === 1 && typeof validators[0] === 'string' && validators[0].includes(',')) {
                    console.log("Warning: Validators list appears to be a concatenated string. This might cause comparison issues.");
                }

                // Normalize account address for comparison
                const normalizedAccountAddress = accountAddress.toLowerCase().startsWith('0x')
                    ? accountAddress.toLowerCase()
                    : `0x${accountAddress.toLowerCase()}`;

                console.log(`Checking if ${normalizedAccountAddress} is in validator list`);

                // Log all address formats we're checking against for debugging
                console.log("Comparing against these validator addresses:");
                validators.forEach((v, i) => {
                    console.log(`Validator ${i}: ${v}`);
                });

                // Check if account is a validator with robust address comparison
                let foundMatch = false;
                extData.validator.isValidator = validators.some(v => {
                    // Handle different formats that might come from the API
                    const validatorAddr = (typeof v === 'string' ? v : String(v)).toLowerCase();

                    // If the validator address contains a comma, it might be a concatenated string
                    if (validatorAddr.includes(',')) {
                        console.log(`Validator address contains commas, checking individual parts: ${validatorAddr}`);
                        // Split by comma and check each part
                        const parts = validatorAddr.split(',').map(part => part.trim().toLowerCase());

                        // Check each part against the account address
                        for (const part of parts) {
                            const partWith0x = part.startsWith('0x') ? part : `0x${part}`;
                            const partWithout0x = part.startsWith('0x') ? part.substring(2) : part;

                            const accountWith0x = normalizedAccountAddress;
                            const accountWithout0x = normalizedAccountAddress.startsWith('0x')
                                ? normalizedAccountAddress.substring(2)
                                : normalizedAccountAddress;

                            // Compare with and without 0x prefix
                            if (partWith0x === accountWith0x || partWithout0x === accountWithout0x) {
                                console.log(`Found validator match in split parts: ${part} equals ${normalizedAccountAddress}`);
                                foundMatch = true;
                                return true;
                            }
                        }
                        return false;
                    }

                    // Normal case - single address comparison
                    const validatorAddrWith0x = validatorAddr.startsWith('0x') ? validatorAddr : `0x${validatorAddr}`;
                    const validatorAddrWithout0x = validatorAddr.startsWith('0x') ? validatorAddr.substring(2) : validatorAddr;

                    const accountWith0x = normalizedAccountAddress;
                    const accountWithout0x = normalizedAccountAddress.startsWith('0x')
                        ? normalizedAccountAddress.substring(2)
                        : normalizedAccountAddress;

                    // Compare with and without 0x prefix to catch all formats
                    const isMatch = validatorAddrWith0x === accountWith0x ||
                        validatorAddrWithout0x === accountWithout0x ||
                        validatorAddr === accountWithout0x ||
                        validatorAddr === accountWith0x;

                    if (isMatch) {
                        console.log(`Found validator match: ${validatorAddr} equals ${normalizedAccountAddress}`);
                        foundMatch = true;
                    }

                    return isMatch;
                });

                // Additional fallback check for comma-separated validators
                if (!foundMatch) {
                    // Check if any validator string contains our address as a substring (for comma-separated lists)
                    for (const v of validators) {
                        const validatorStr = String(v).toLowerCase();

                        const accountWith0x = normalizedAccountAddress.toLowerCase();
                        const accountWithout0x = accountWith0x.startsWith('0x') ? accountWith0x.substring(2) : accountWith0x;

                        if (validatorStr.includes(accountWith0x) || validatorStr.includes(accountWithout0x)) {
                            console.log(`Found validator match as substring: Address ${normalizedAccountAddress} is included in "${validatorStr}"`);
                            extData.validator.isValidator = true;
                            foundMatch = true;
                            break;
                        }
                    }
                }

                console.log(`Is validator result: ${extData.validator.isValidator}`);

                if (extData.validator.isValidator) {
                    // Only fetch these if the account is a validator
                    extData.validator.currentBid = await openLibraSdk.getCurrentBid(accountAddress);
                    extData.validator.grade = await openLibraSdk.getValidatorGrade(accountAddress);
                    extData.validator.jailReputation = await openLibraSdk.getJailReputation(accountAddress);
                    extData.validator.countBuddiesJailed = await openLibraSdk.getCountBuddiesJailed(accountAddress);

                    console.log("Validator details:", {
                        bid: extData.validator.currentBid,
                        grade: extData.validator.grade,
                        jailReputation: extData.validator.jailReputation,
                        countBuddiesJailed: extData.validator.countBuddiesJailed
                    });
                }
            } catch (error) {
                console.warn("Error fetching validator status:", error);
            }

            console.log("Attempting to fetch community wallet status...");
            try {
                // Check if address is a Community Wallet
                extData.communityWallet.isDonorVoice = await openLibraSdk.isDonorVoice(accountAddress);

                // If it's a community wallet, check additional properties
                if (extData.communityWallet.isDonorVoice) {
                    extData.communityWallet.isAuthorized = await openLibraSdk.isDonorVoiceAuthorized(accountAddress);
                    extData.communityWallet.isReauthProposed = await openLibraSdk.isReauthProposed(accountAddress);

                    // Additional community wallet properties
                    extData.communityWallet.isInitialized = await openLibraSdk.isCommunityWalletInit(accountAddress);
                    extData.communityWallet.isWithinAuthorizeWindow = await openLibraSdk.isWithinAuthorizeWindow(accountAddress);
                    extData.communityWallet.vetoTally = await openLibraSdk.getVetoTally(accountAddress);
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
                        // Type cast the values to AccountResource[] to satisfy TypeScript
                        fetchedAccount.resources = values as AccountResource[];
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