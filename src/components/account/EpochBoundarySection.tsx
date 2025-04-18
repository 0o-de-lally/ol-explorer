import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { observer } from '@legendapp/state/react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Row, Column } from '../Layout';
import { useEpochData } from '../../hooks/useEpochData';
import appConfig from '../../config/appConfig';

type EpochBoundarySectionProps = {
    accountAddress: string;
    isDesktop: boolean;
    isValidator: boolean;
    isVisible?: boolean;
};

export const EpochBoundarySection = observer(({
    accountAddress,
    isDesktop,
    isValidator,
    isVisible = true
}: EpochBoundarySectionProps) => {
    // Use our custom hook to get epoch data
    const {
        bidders,
        maxSeats,
        filledSeats,
        isLoading,
        error,
        refresh
    } = useEpochData(isVisible);

    // Calculate if this account is bidding
    const isAccountBidding = bidders.some(
        addr => addr.toLowerCase() === accountAddress?.toLowerCase()
    );

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

    // Only show this section for validator accounts
    if (!isValidator) {
        return null;
    }

    return (
        <Card className="mb-4">
            <Row justifyContent="between" alignItems="center" className="mb-3">
                <Text className="text-text-light text-base font-bold">Epoch Boundary Status</Text>
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
                <Row className="mb-3">
                    <Column className="w-1/2">
                        <Text className="text-text-light text-sm mb-1">Validator Seats</Text>
                        <TouchableOpacity
                            onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::epoch_boundary::get_max_seats_offered`)}&initialArgs=${encodeURIComponent('')}`)
                            }}
                        >
                            <Text className="text-white text-base">
                                {filledSeats} / {maxSeats} filled
                            </Text>
                        </TouchableOpacity>
                    </Column>

                    <Column className="w-1/2">
                        <Text className="text-text-light text-sm mb-1">Bidding Status</Text>
                        <View className={`px-2 py-0.5 rounded-md w-auto inline-block ${isAccountBidding ? 'bg-green-800' : 'bg-gray-800'}`}>
                            <Text className="text-white text-xs">
                                {isAccountBidding ? 'Active Bidder' : 'Not Bidding'}
                            </Text>
                        </View>
                    </Column>
                </Row>

                <View className="mt-4">
                    <TouchableOpacity
                        onPress={() => {
                            router.push(`/view?initialPath=${encodeURIComponent(`${appConfig.network.OL_FRAMEWORK}::proof_of_fee::get_bidders`)}&initialArgs=${encodeURIComponent('')}`)
                        }}
                        className="flex-row items-center"
                    >
                        <Text className="text-text-light text-sm mr-2">Current Bidders ({bidders.length}):</Text>
                        <View className="bg-blue-800 px-2 py-0.5 rounded-md">
                            <Text className="text-white text-xs">View All</Text>
                        </View>
                    </TouchableOpacity>

                    {bidders.length > 0 && (
                        <View className="border border-border/30 rounded-md mt-2 p-2 max-h-32 overflow-y-auto">
                            {bidders.slice(0, 5).map((address, index) => (
                                <Text key={address} className="text-white text-xs font-mono mb-1">
                                    {isDesktop ? address : formatAddressForDisplay(address)}
                                    {index === 4 && bidders.length > 5 ? ` + ${bidders.length - 5} more...` : ''}
                                </Text>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </Card>
    );
}); 