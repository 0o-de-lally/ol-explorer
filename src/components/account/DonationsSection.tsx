import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { observer } from '@legendapp/state/react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Row } from '../Layout';
import { useDonations } from '../../hooks/useDonations';
import appConfig from '../../config/appConfig';
import tokenConfig from '../../config/tokenConfig';

// Helper to format token amounts
const formatTokenAmount = (amount: number | string, decimals: number = 6): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const divisor = Math.pow(10, decimals);
    const wholeAmount = numAmount / divisor;
    return wholeAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
    });
};

type DonationsSectionProps = {
    accountAddress: string;
    isDesktop: boolean;
    isCommunityWallet: boolean;
    isVisible?: boolean;
};

export const DonationsSection = observer(({
    accountAddress,
    isDesktop,
    isCommunityWallet,
    isVisible = true
}: DonationsSectionProps) => {
    // Use our custom hook to get donations data
    const {
        donationsMade,
        donationsReceived,
        isLoading,
        error,
        refresh
    } = useDonations(accountAddress, isCommunityWallet, isVisible);

    // Handle refresh
    const handleRefresh = () => {
        refresh();
    };

    // Helper to format address for display
    const formatAddressForDisplay = (address: string): string => {
        if (!address) return '';
        if (address.length <= 10) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    // Navigate to account details
    const navigateToAccount = (address: string) => {
        router.push(`/account/${address}`);
    };

    return (
        <Card className="mb-4">
            <Row justifyContent="between" alignItems="center" className="mb-3">
                <Text className="text-text-light text-base font-bold">
                    {isCommunityWallet ? 'Received Donations' : 'Donations Made'}
                </Text>
                <TouchableOpacity
                    onPress={handleRefresh}
                    className="p-1.5 bg-primary rounded-md flex items-center justify-center"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <View className="flex-row items-center">
                            <Ionicons name="refresh-outline" size={14} color="white" />
                            <Text className="text-white text-xs ml-1">Refresh</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Row>

            {error && (
                <View className="bg-red-800/20 rounded-md p-3 mb-3">
                    <Text className="text-red-300 text-sm">{error}</Text>
                </View>
            )}

            <View className="bg-background rounded-lg p-4">
                {/* Registry link for all community wallets */}
                <TouchableOpacity
                    onPress={() => {
                        router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::donor_voice::get_root_registry`)}&initialArgs=${encodeURIComponent('')}`)
                    }}
                    className="mb-4"
                >
                    <View className="bg-blue-800 px-3 py-2 rounded-md inline-block">
                        <Text className="text-white text-sm">View All Community Wallets</Text>
                    </View>
                </TouchableOpacity>

                {isCommunityWallet ? (
                    // Show received donations for community wallets
                    <>
                        <Text className="text-text-light text-sm font-medium mb-2">
                            Received Donations ({donationsReceived.length})
                        </Text>

                        {donationsReceived.length > 0 ? (
                            <View className="border border-border/30 rounded-md overflow-hidden">
                                {/* Table header for desktop */}
                                {isDesktop && (
                                    <View className="flex-row py-2 px-3 bg-gray-800/50 border-b border-border/30">
                                        <Text className="text-text-muted text-xs font-medium w-1/2">Donor</Text>
                                        <Text className="text-text-muted text-xs font-medium w-1/2 text-right">Amount</Text>
                                    </View>
                                )}

                                {donationsReceived.map((donation, index) => (
                                    <View
                                        key={`${donation.donor || ''}-${index}`}
                                        className={`p-3 ${index !== donationsReceived.length - 1 ? 'border-b border-border/30' : ''}`}
                                    >
                                        <View className="flex-row justify-between items-center">
                                            <TouchableOpacity
                                                onPress={() => donation.donor && navigateToAccount(donation.donor)}
                                                className="w-1/2"
                                            >
                                                <Text className="text-white text-sm font-mono">
                                                    {donation.donor && (isDesktop ? donation.donor : formatAddressForDisplay(donation.donor))}
                                                </Text>
                                            </TouchableOpacity>

                                            <Text className="text-white text-sm font-mono text-right w-1/2">
                                                {formatTokenAmount(donation.amount, tokenConfig.tokens.libraToken.decimals)} {tokenConfig.tokens.libraToken.symbol}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text className="text-text-light text-sm italic">
                                No donations received
                            </Text>
                        )}
                    </>
                ) : (
                    // Show made donations for regular accounts
                    <>
                        <Text className="text-text-light text-sm font-medium mb-2">
                            Donations Made ({donationsMade.length})
                        </Text>

                        {donationsMade.length > 0 ? (
                            <View className="border border-border/30 rounded-md overflow-hidden">
                                {/* Table header for desktop */}
                                {isDesktop && (
                                    <View className="flex-row py-2 px-3 bg-gray-800/50 border-b border-border/30">
                                        <Text className="text-text-muted text-xs font-medium w-1/2">Community Wallet</Text>
                                        <Text className="text-text-muted text-xs font-medium w-1/2 text-right">Amount</Text>
                                    </View>
                                )}

                                {donationsMade.map((donation, index) => (
                                    <View
                                        key={`${donation.dvAccount}-${index}`}
                                        className={`p-3 ${index !== donationsMade.length - 1 ? 'border-b border-border/30' : ''}`}
                                    >
                                        <View className="flex-row justify-between items-center">
                                            <TouchableOpacity
                                                onPress={() => navigateToAccount(donation.dvAccount)}
                                                className="w-1/2"
                                            >
                                                <Text className="text-white text-sm font-mono">
                                                    {isDesktop ? donation.dvAccount : formatAddressForDisplay(donation.dvAccount)}
                                                </Text>
                                            </TouchableOpacity>

                                            <Text className="text-white text-sm font-mono text-right w-1/2">
                                                {formatTokenAmount(donation.amount, tokenConfig.tokens.libraToken.decimals)} {tokenConfig.tokens.libraToken.symbol}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text className="text-text-light text-sm italic">
                                No donations made
                            </Text>
                        )}
                    </>
                )}
            </View>
        </Card>
    );
}); 