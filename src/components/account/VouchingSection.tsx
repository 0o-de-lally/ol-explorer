import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { observer } from '@legendapp/state/react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Row, Column } from '../Layout';
import { useVouching } from '../../hooks/useVouching';
import appConfig from '../../config/appConfig';

type VouchingSectionProps = {
    accountAddress: string;
    hasValidVouchScore: boolean;
    isDesktop: boolean;
    isVisible?: boolean;
};

export const VouchingSection = observer(({
    accountAddress,
    hasValidVouchScore,
    isDesktop,
    isVisible = true
}: VouchingSectionProps) => {
    // Use our custom hook
    const {
        vouchesOutbound,
        vouchesInbound,
        pageRankScore,
        isLoading,
        error,
        refresh
    } = useVouching(accountAddress, isVisible);

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
                <Text className="text-text-light text-base font-bold">Vouching Network</Text>
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

            {/* Vouching Scores Section */}
            <View className="bg-background rounded-lg p-4 mb-4 w-full">
                <Text className="text-text-light text-base font-bold mb-3">Vouching Score</Text>

                <Row className="mb-2">
                    <Text className="text-text-light text-sm mr-2">Score:</Text>
                    <TouchableOpacity
                        onPress={() => {
                            router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::page_rank_lazy::get_cached_score`)}&initialArgs=${encodeURIComponent(`"${accountAddress}"`)}`)
                        }}
                    >
                        <Text className="text-white text-sm font-bold">{pageRankScore !== null ? pageRankScore.toFixed(4) : 'N/A'}</Text>
                    </TouchableOpacity>
                </Row>

                <Row className="mb-2">
                    <Text className="text-text-light text-sm mr-2">Valid Score:</Text>
                    <View className={`px-2 py-0.5 rounded-md ${hasValidVouchScore ? 'bg-green-800' : 'bg-red-800'}`}>
                        <Text className="text-white text-xs">
                            {hasValidVouchScore ? 'Yes' : 'No'}
                        </Text>
                    </View>
                </Row>
            </View>

            {/* Vouching Relationships Section */}
            <View className="bg-background rounded-lg p-4 w-full">
                <Text className="text-text-light text-base font-bold mb-3">Vouching Relationships</Text>

                {/* Accounts this account vouches for */}
                <View className="mb-4">
                    <Text className="text-text-light text-sm font-medium mb-2">
                        Vouches For ({vouchesOutbound.length})
                    </Text>

                    {vouchesOutbound.length > 0 ? (
                        <View className="border border-border/30 rounded-md overflow-hidden">
                            {vouchesOutbound.map((address, index) => (
                                <TouchableOpacity
                                    key={address}
                                    onPress={() => navigateToAccount(address)}
                                    className={`p-2 ${index !== vouchesOutbound.length - 1 ? 'border-b border-border/30' : ''}`}
                                >
                                    <Text className="text-white text-sm font-mono">
                                        {isDesktop ? address : formatAddressForDisplay(address)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <Text className="text-text-light text-sm italic">
                            No vouches given
                        </Text>
                    )}
                </View>

                {/* Accounts that vouch for this account */}
                <View>
                    <Text className="text-text-light text-sm font-medium mb-2">
                        Vouched By ({vouchesInbound.length})
                    </Text>

                    {vouchesInbound.length > 0 ? (
                        <View className="border border-border/30 rounded-md overflow-hidden">
                            {vouchesInbound.map((address, index) => (
                                <TouchableOpacity
                                    key={address}
                                    onPress={() => navigateToAccount(address)}
                                    className={`p-2 ${index !== vouchesInbound.length - 1 ? 'border-b border-border/30' : ''}`}
                                >
                                    <Text className="text-white text-sm font-mono">
                                        {isDesktop ? address : formatAddressForDisplay(address)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <Text className="text-text-light text-sm italic">
                            No vouches received
                        </Text>
                    )}
                </View>
            </View>
        </Card>
    );
}); 