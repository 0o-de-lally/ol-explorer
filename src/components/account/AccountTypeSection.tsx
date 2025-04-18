import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { observer } from '@legendapp/state/react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Row } from '../Layout';
import { useSdk } from '../../hooks/useSdk';
import appConfig from '../../config/appConfig';
import tokenConfig from '../../config/tokenConfig';
import { ExtendedAccountData } from '../../store/accountStore';
import { formatAddressForDisplay } from '../../utils/addressUtils';

// Helper to safely get values from observables
const getObservableValue = <T,>(value: any, defaultValue: T): T => {
    try {
        if (value === undefined || value === null) {
            return defaultValue;
        }
        if (typeof value === 'object' && value !== null && typeof value.get === 'function') {
            try {
                return value.get() ?? defaultValue;
            } catch (e) {
                return defaultValue;
            }
        }
        return value;
    } catch (e) {
        return defaultValue;
    }
};

// Component props
interface AccountTypeSectionProps {
    accountData: any;
    extendedData: ExtendedAccountData | null;
    isDesktop: boolean;
    copyToClipboard: (text: string) => void;
}

// Get token decimals from config - needed for formatting
const TOKEN_DECIMALS = tokenConfig.tokens.libraToken.decimals;

export const AccountTypeSection = observer(({
    accountData,
    extendedData,
    isDesktop,
    copyToClipboard
}: AccountTypeSectionProps) => {
    // Add state for tracking if the account is in the current validators list
    const [isInCurrentValidators, setIsInCurrentValidators] = useState(false);
    // Get SDK reference
    const openLibraSdk = useSdk();

    if (!extendedData || !extendedData.accountType) {
        return null;
    }

    // Get account type data - using getObservableValue for safe unwrapping
    const isRegularWallet = getObservableValue(extendedData.accountType.isRegularWallet, false);
    const isSlowWallet = getObservableValue(extendedData.accountType.isSlowWallet, false);
    const isValidatorWallet = getObservableValue(extendedData.accountType.isValidatorWallet, false);
    const isCommunityWallet = getObservableValue(extendedData.accountType.isCommunityWallet, false);
    const isV8Authorized = getObservableValue(extendedData.accountType.isV8Authorized, false);

    // Determine the account type text to display
    let accountTypeText = "Regular Wallet";
    let accountTypeDescription = "Standard account with full control over your coins.";
    let accountTypeIcon = "wallet-outline" as any;
    let accountTypeBgColor = "bg-blue-800";

    if (isCommunityWallet) {
        accountTypeText = "Community Wallet";
        accountTypeDescription = "Donor Voice for community projects with governance features.";
        accountTypeIcon = "people-outline" as any;
        accountTypeBgColor = "bg-green-800";
    } else if (isValidatorWallet) {
        accountTypeText = "Validator Wallet";
        accountTypeDescription = "Validates transactions and participates in consensus.";
        accountTypeIcon = "checkmark-circle-outline" as any;
        accountTypeBgColor = "bg-purple-800";
    } else if (isSlowWallet) {
        accountTypeText = "Slow Wallet";
        accountTypeDescription = "Gradually unlocks coins over time. Reduced withdrawal limits.";
        accountTypeIcon = "hourglass-outline" as any;
        accountTypeBgColor = "bg-amber-800";
    }

    // Helper function to format balance for slow wallet display
    const formatSlowBalance = (rawBalance: string | number): string => {
        // Convert string to number if needed
        const balance = typeof rawBalance === 'string' ? parseInt(rawBalance, 10) : rawBalance;

        // Calculate whole and fractional parts based on TOKEN_DECIMALS
        const divisor = Math.pow(10, TOKEN_DECIMALS);
        const wholePart = Math.floor(balance / divisor);
        const fractionalPart = balance % divisor;

        // Format with proper decimal places
        const wholePartFormatted = wholePart.toLocaleString();

        // Convert fractional part to string with proper padding
        const fractionalStr = fractionalPart.toString().padStart(TOKEN_DECIMALS, '0');

        // Trim trailing zeros but keep at least 2 decimal places if there's a fractional part
        const trimmedFractional = fractionalPart > 0
            ? fractionalStr.replace(/0+$/, '').padEnd(2, '0')
            : '00';

        // Only show decimal part if it's non-zero
        return trimmedFractional === '00'
            ? wholePartFormatted
            : `${wholePartFormatted}.${trimmedFractional}`;
    };

    // Safe access to address
    const accountAddress = getObservableValue(accountData.address, '');

    // Effect to check if the account is in the current validators list
    useEffect(() => {
        const checkIfInCurrentValidators = async () => {
            if (!accountAddress) return;

            try {
                // Get the current validators list
                const currentValidators = await openLibraSdk.getCurrentValidators();

                // Normalize all addresses for case-insensitive comparison
                const normalizedAddress = (accountAddress as string).toLowerCase();
                const normalizedValidators = currentValidators.map(addr =>
                    typeof addr === 'string' ? addr.toLowerCase() : ''
                );

                // Check if the account address is in the current validators list
                const isActive = normalizedValidators.includes(normalizedAddress);
                setIsInCurrentValidators(isActive);
            } catch (error) {
                console.error('Error checking if in current validators:', error);
                setIsInCurrentValidators(false);
            }
        };

        checkIfInCurrentValidators();
    }, [accountAddress, openLibraSdk]);

    // Safe access to slow wallet data
    const slowWalletUnlockedAmount = isSlowWallet && extendedData.slowWallet ?
        getObservableValue(extendedData.slowWallet.unlockedAmount, "0") : "0";

    const slowWalletTransferredAmount = isSlowWallet && extendedData.slowWallet ?
        getObservableValue(extendedData.slowWallet.transferredAmount, "0") : "0";

    // Safe access to reauth data
    const isReauthProposed = isCommunityWallet && extendedData.reauth ?
        getObservableValue(extendedData.reauth.isReauthProposed, false) : false;

    const reauthTally = isCommunityWallet && extendedData.reauth ?
        getObservableValue(extendedData.reauth.reauthTally, [0, 0, 0]) : [0, 0, 0];

    const reauthDeadline = isCommunityWallet && extendedData.reauth ?
        getObservableValue(extendedData.reauth.reauthDeadline, 0) : 0;

    const isLiquidationProposed = isCommunityWallet && extendedData.reauth ?
        getObservableValue(extendedData.reauth.isLiquidationProposed, false) : false;

    // Safe access to community wallet data
    const isDonorVoice = isCommunityWallet && extendedData.communityWallet ?
        getObservableValue(extendedData.communityWallet.isDonorVoice, false) : false;

    const isAuthorized = isCommunityWallet && extendedData.communityWallet ?
        getObservableValue(extendedData.communityWallet.isAuthorized, false) : false;

    const isWithinAuthorizeWindow = isCommunityWallet && extendedData.communityWallet ?
        getObservableValue(extendedData.communityWallet.isWithinAuthorizeWindow, false) : false;

    const vetoTally = isCommunityWallet && extendedData.communityWallet ?
        getObservableValue(extendedData.communityWallet.vetoTally, 0) : 0;

    // Access validator-specific data
    const validatorData = extendedData.validator;
    const isValidator = getObservableValue(validatorData?.isValidator, false);
    const currentBid = getObservableValue(validatorData?.currentBid, [0, 0]);
    const validatorGrade = getObservableValue(validatorData?.grade, { isCompliant: false, acceptedProposals: 0, failedProposals: 0 });
    const jailReputation = getObservableValue(validatorData?.jailReputation, 0);
    const countBuddiesJailed = getObservableValue(validatorData?.countBuddiesJailed, 0);
    const isInUniverse = getObservableValue(extendedData.accountType.isValidatorWallet, false);
    const isJailed = getObservableValue(validatorData?.isJailed, false);

    return (
        <Card className="mb-4">
            {/* 1. Account Address Section - First at the top */}
            <Row justifyContent="between" alignItems="center" className="mb-3">
                <Text className="text-text-light text-base font-bold">Account Address</Text>
            </Row>

            <Row alignItems="center" className="mb-4">
                <View className="bg-background rounded px-3 py-2 flex-1">
                    <TouchableOpacity onPress={() => copyToClipboard(accountAddress)}>
                        <Text className="text-text-light font-mono text-sm">
                            {isDesktop
                                ? accountAddress
                                : formatAddressForDisplay(accountAddress, 6, 4)}
                        </Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    onPress={() => copyToClipboard(accountAddress)}
                    className="p-1.5 bg-primary rounded-md ml-2 flex items-center justify-center w-8 h-8"
                >
                    <Ionicons name="copy-outline" size={14} color="white" />
                </TouchableOpacity>
            </Row>

            {/* 2. Account Type Section - Second */}
            <Row justifyContent="between" alignItems="center" className="mb-3">
                <Text className="text-text-light text-base font-bold">Account Type</Text>
            </Row>

            <View className={`${accountTypeBgColor} rounded-lg p-4 mb-4 flex-row items-start flex-wrap`}>
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                    <Ionicons name={accountTypeIcon} size={16} color="white" />
                </View>
                <View className="ml-3 flex-1">
                    <Text className="text-white text-lg font-bold">{accountTypeText}</Text>
                    <Text className="text-white text-sm opacity-90 flex-shrink">{accountTypeDescription}</Text>
                </View>
            </View>

            {/* 3. V8 Authorization Status - Third */}
            <Row justifyContent="between" alignItems="center" className="mb-3">
                <Text className="text-text-light text-base font-bold">Authorization Status</Text>
            </Row>

            <View className="bg-background rounded px-3 py-3 mb-4">
                <Row alignItems="center" className="mb-2">
                    <Text className="text-text-light text-sm mr-2">V8 Authorized:</Text>
                    <TouchableOpacity
                        onPress={() => {
                            router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::reauthorization::is_v8_authorized`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                        }}
                    >
                        {isV8Authorized ? (
                            <View className="bg-green-800 px-2 py-0.5 rounded-md">
                                <Text className="text-white text-xs">Yes</Text>
                            </View>
                        ) : (
                            <View className="bg-red-800 px-2 py-0.5 rounded-md">
                                <Text className="text-white text-xs">No</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Row>

                {!isV8Authorized && (
                    <Text className="text-red-500 text-xs ml-4 mt-1">
                        This account is not authorized to transact on the V8 network.
                        It needs to be touched by a transaction to migrate.
                    </Text>
                )}
            </View>

            {/* Add Account Balance section here - after Authorization Status and before type-specific sections */}
            <Row justifyContent="between" alignItems="center" className="mb-3">
                <Text className="text-text-light text-base font-bold">Account Balance</Text>
            </Row>

            <View className="bg-background rounded px-3 py-3 mb-4">
                <Row alignItems="center" className="mb-2">
                    <Text className="text-text-light text-sm mr-2">Total Balance:</Text>
                    <TouchableOpacity
                        onPress={() => {
                            router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::ol_account::balance`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                        }}
                    >
                        <Text className="text-white text-sm font-mono">
                            {formatSlowBalance(getObservableValue(accountData.balance, 0))} {tokenConfig.tokens.libraToken.symbol}
                        </Text>
                    </TouchableOpacity>
                </Row>

                <Row alignItems="center">
                    <Text className="text-text-light text-sm mr-2">Unlocked Balance:</Text>
                    <Text className="text-white text-sm font-mono">
                        {formatSlowBalance(getObservableValue(accountData.unlocked_balance, 0))} {tokenConfig.tokens.libraToken.symbol}
                    </Text>
                </Row>
            </View>

            {/* 4. Type-specific sections - conditionally rendered based on account type */}

            {/* Slow Wallet Specific Info */}
            {isSlowWallet && (
                <>
                    <Row justifyContent="between" alignItems="center" className="mb-3">
                        <Text className="text-text-light text-base font-bold">Slow Wallet Details</Text>
                    </Row>

                    <View className="bg-background rounded px-3 py-3 mb-4">
                        <Row alignItems="center" className="mb-2">
                            <Text className="text-text-light text-sm mr-2">Unlocked Amount:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::slow_wallet::unlocked_amount`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <Text className="text-white text-sm font-mono">
                                    {formatSlowBalance(slowWalletUnlockedAmount)} {tokenConfig.tokens.libraToken.symbol}
                                </Text>
                            </TouchableOpacity>
                        </Row>

                        <Row alignItems="center">
                            <Text className="text-text-light text-sm mr-2">Transferred Amount:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::slow_wallet::transferred_amount`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <Text className="text-white text-sm font-mono">
                                    {formatSlowBalance(slowWalletTransferredAmount)} {tokenConfig.tokens.libraToken.symbol}
                                </Text>
                            </TouchableOpacity>
                        </Row>
                    </View>
                </>
            )}

            {/* Community Wallet Specific Info */}
            {isCommunityWallet && (
                <>
                    <Row justifyContent="between" alignItems="center" className="mb-3">
                        <Text className="text-text-light text-base font-bold">Community Wallet Status</Text>
                    </Row>

                    <View className="bg-background rounded px-3 py-3 mb-4">
                        {/* Always show basic community wallet status */}
                        <Row alignItems="center" className="mb-2">
                            <Text className="text-text-light text-sm mr-2">Authorization Status:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice_reauth::is_authorized`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <View className={`px-2 py-0.5 rounded-md ${isAuthorized ? 'bg-green-800' : 'bg-red-800'}`}>
                                    <Text className="text-white text-xs">
                                        {isAuthorized ? 'Authorized' : 'Not Authorized'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Row>

                        {/* Special handling for unauthorized wallets */}
                        {!isAuthorized && (
                            <>
                                {isReauthProposed ? (
                                    // If reauthorization is proposed, show vote information
                                    <Row alignItems="center" className="mb-2">
                                        <Text className="text-text-light text-sm mr-2">Reauthorization:</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice_governance::is_reauth_proposed`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                            }}
                                        >
                                            <View className="bg-blue-800 px-2 py-0.5 rounded-md">
                                                <Text className="text-white text-xs">Vote In Progress</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </Row>
                                ) : (
                                    // If no reauthorization proposed, show warning message
                                    <View className="bg-red-800/20 rounded-md p-2 mb-2">
                                        <Text className="text-red-300 text-xs">
                                            This Community Wallet is not authorized and does not have a reauthorization vote in progress.
                                            Donors can propose reauthorization for a wallet that has lost authorization.
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}

                        <Row alignItems="center" className="mb-2">
                            <Text className="text-text-light text-sm mr-2">Veto Tally:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice_governance::get_veto_tally`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <Text className="text-white text-sm">{vetoTally}</Text>
                            </TouchableOpacity>
                        </Row>

                        {/* Show if wallet is within authorization window */}
                        <Row alignItems="center" className="mb-2">
                            <Text className="text-text-light text-sm mr-2">Within Auth Window:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice_reauth::is_within_authorize_window`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <View className={`px-2 py-0.5 rounded-md ${isWithinAuthorizeWindow ? 'bg-green-800' : 'bg-yellow-800'}`}>
                                    <Text className="text-white text-xs">
                                        {isWithinAuthorizeWindow ? 'Yes' : 'No'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Row>

                        {/* Show reauthorization vote details if proposed */}
                        {isReauthProposed && (
                            <>
                                <Row alignItems="center" className="mb-2 ml-4">
                                    <Text className="text-text-light text-xs mr-2">Approval:</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice_governance::get_reauth_tally`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                        }}
                                    >
                                        <Text className="text-white text-xs">
                                            {reauthTally[0]}% (Need {reauthTally[2]}%)
                                        </Text>
                                    </TouchableOpacity>
                                </Row>

                                <Row alignItems="center" className="mb-2 ml-4">
                                    <Text className="text-text-light text-xs mr-2">Turnout:</Text>
                                    <Text className="text-white text-xs">{reauthTally[1]}%</Text>
                                </Row>

                                <Row alignItems="center" className="mb-4 ml-4">
                                    <Text className="text-text-light text-xs mr-2">Deadline (Epoch):</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice_governance::get_reauth_deadline`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                        }}
                                    >
                                        <Text className="text-white text-xs">{reauthDeadline}</Text>
                                    </TouchableOpacity>
                                </Row>
                            </>
                        )}

                        {/* Show liquidation information if proposed */}
                        {isLiquidationProposed && (
                            <Row alignItems="center" className="mb-2">
                                <Text className="text-text-light text-sm mr-2">Liquidation:</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice_governance::is_liquidation_proposed`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                    }}
                                >
                                    <View className="bg-red-800 px-2 py-0.5 rounded-md">
                                        <Text className="text-white text-xs">Proposed</Text>
                                    </View>
                                </TouchableOpacity>
                            </Row>
                        )}

                        {/* Add a link to check if this account is a donor voice account */}
                        <Row alignItems="center" className="mb-2 mt-4">
                            <Text className="text-text-light text-sm mr-2">Donor Voice Status:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice::is_donor_voice`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <View className="bg-indigo-800 px-2 py-1 rounded-md">
                                    <Text className="text-white text-xs">Check Status</Text>
                                </View>
                            </TouchableOpacity>
                        </Row>

                        {/* Add a link to view all donors by checking the donations registry */}
                        <Row alignItems="center" className="mt-2">
                            <Text className="text-text-light text-sm mr-2">View Donors:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice::get_root_registry`)}&initialArgs=${encodeURIComponent('')}`)
                                }}
                            >
                                <View className="bg-blue-800 px-2 py-1 rounded-md">
                                    <Text className="text-white text-xs">Donor Registry</Text>
                                </View>
                            </TouchableOpacity>
                        </Row>
                    </View>
                </>
            )}

            {/* Validator Specific Info */}
            {(isValidatorWallet || isValidator) && (
                <>
                    <Row justifyContent="between" alignItems="center" className="mb-3">
                        <Text className="text-text-light text-base font-bold">Validator Details</Text>
                    </Row>

                    <View className="bg-background rounded px-3 py-3 mb-4">
                        <Row alignItems="center" className="mb-2">
                            <Text className="text-text-light text-sm mr-2">Validator Status:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::validator_universe::is_in_universe`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <View className={`mr-2 px-2 py-0.5 rounded-md ${isInUniverse ? 'bg-green-800' : 'bg-yellow-800'}`}>
                                    <Text className="text-white text-xs">
                                        {isInUniverse ? 'In Universe' : 'Not In Universe'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::stake::get_current_validators`)}&initialArgs=${encodeURIComponent('')}`)
                                }}
                            >
                                <View className={`mr-2 px-2 py-0.5 rounded-md ${isInCurrentValidators ? 'bg-green-800' : 'bg-red-800'}`}>
                                    <Text className="text-white text-xs">
                                        {isInCurrentValidators ? 'Active Validator' : 'Not Active'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Row>

                        <Row alignItems="center" className="mb-2">
                            <Text className="text-text-light text-sm mr-2">Jail Status:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::jail::is_jailed`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <View className={`mr-2 px-2 py-0.5 rounded-md ${isJailed ? 'bg-red-800' : 'bg-green-800'}`}>
                                    <Text className="text-white text-xs">
                                        {isJailed ? 'Jailed' : 'Not Jailed'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Row>

                        <Row alignItems="center" className="mb-2">
                            <Text className="text-text-light text-sm mr-2">Current Bid:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::proof_of_fee::current_bid`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <Text className="text-white text-sm">
                                    {Array.isArray(currentBid) ?
                                        `${currentBid[0].toLocaleString()} / ${currentBid[1].toLocaleString()}`
                                        : '0 / 0'}
                                </Text>
                            </TouchableOpacity>
                        </Row>

                        {/* Only show validator grade and proposals if the validator is in the active set */}
                        {isInCurrentValidators && (
                            <>
                                <Row alignItems="center" className="mb-2">
                                    <Text className="text-text-light text-sm mr-2">Validator Grade:</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::grade::get_validator_grade`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                        }}
                                    >
                                        <View className={`mr-2 px-2 py-0.5 rounded-md ${validatorGrade.isCompliant ? 'bg-green-800' : 'bg-red-800'}`}>
                                            <Text className="text-white text-xs">
                                                {validatorGrade.isCompliant ? 'Compliant' : 'Non-Compliant'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Row>

                                <Row alignItems="center" className="mb-2">
                                    <Text className="text-text-light text-sm ml-4">Proposals Passed/Failed:</Text>
                                    <Text className="text-white text-sm ml-2">
                                        {`${validatorGrade.acceptedProposals.toLocaleString()}/${validatorGrade.failedProposals.toLocaleString()}`}
                                    </Text>
                                </Row>
                            </>
                        )}

                        <Row alignItems="center" className="mb-2">
                            <Text className="text-text-light text-sm mr-2">Jail Reputation:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::jail::get_jail_reputation`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <Text className="text-white text-sm">
                                    {jailReputation}
                                </Text>
                            </TouchableOpacity>
                        </Row>

                        <Row alignItems="center">
                            <Text className="text-text-light text-sm mr-2">Buddies Jailed:</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::jail::get_count_buddies_jailed`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                                }}
                            >
                                <Text className="text-white text-sm">
                                    {countBuddiesJailed}
                                </Text>
                            </TouchableOpacity>
                        </Row>
                    </View>
                </>
            )}
        </Card>
    );
}); 