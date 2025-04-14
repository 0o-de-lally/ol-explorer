import React, { useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useCommunityWallets } from '../hooks/useCommunityWallets';
import { CommunityWalletData } from '../store/communityWalletStore';
import { formatAddressForDisplay, stripLeadingZeros } from '../utils/addressUtils';
import { Card, Row, Column } from './Layout';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import tokenConfig from '../config/tokenConfig';

// Token decimals for formatting balances
const TOKEN_DECIMALS = tokenConfig.tokens.libraToken.decimals;

// Format balance with proper token decimals - similar to AccountDetails
const formatBalance = (balance: number): string => {
    if (!balance && balance !== 0) return '0';

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
        ? `${wholePartFormatted} ${tokenConfig.tokens.libraToken.symbol}`
        : `${wholePartFormatted}.${trimmedFractional} ${tokenConfig.tokens.libraToken.symbol}`;
};

type CommunityWalletsProps = {
    isVisible?: boolean;
};

export const CommunityWallets = observer(({ isVisible = true }: CommunityWalletsProps) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    // Track manual refresh state separately from background loading
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    // Use our custom hook - now it returns properly unwrapped data
    const { wallets, isLoading, error, refresh, isStale } = useCommunityWallets(isVisible);

    // Now the wallets array contains already unwrapped data, no need for getObservableValue
    const copyToClipboard = async (text: string) => {
        try {
            // Use the same stripLeadingZeros function for consistency
            const addressToCopy = stripLeadingZeros(text);
            await Clipboard.setStringAsync(addressToCopy);
            setCopySuccess('Address copied!');
            setTimeout(() => setCopySuccess(null), 2000);
        } catch (err) {
            console.error('Clipboard operation failed:', err);
        }
    };

    const handleRefresh = () => {
        // Set manual refresh indicator
        setIsManualRefreshing(true);

        // Trigger refresh and handle the promise
        refresh(true)
            .then(() => {
                // Add small delay to ensure user sees the loading indicator
                setTimeout(() => {
                    setIsManualRefreshing(false);
                }, 500);
            })
            .catch((error: Error) => {
                console.error('Manual refresh failed:', error);
                setIsManualRefreshing(false);
            });
    };

    // Initial loading state with no wallets - same pattern as TransactionsList
    if (isLoading && wallets.length === 0) {
        return (
            <View className="w-full mb-5">
                <Card>
                    <View className="h-1 bg-primary/20" />
                    <Row justifyContent="between" alignItems="center" className="px-4 py-3 border-b border-border/20">
                        <Text className="text-white font-bold text-base">
                            Community Wallets
                        </Text>
                        <ActivityIndicator size="small" color="#E75A5C" />
                    </Row>

                    <View className="p-4 justify-center items-center">
                        <ActivityIndicator size="large" color="#E75A5C" />
                        <Text className="text-white text-base mt-2">Loading community wallets...</Text>
                    </View>
                </Card>
            </View>
        );
    }

    // Component rendering with responsive design - now follows TransactionsList pattern
    return (
        <View className="w-full mb-5">
            <Card>
                <View className="h-1 bg-primary/20" />
                <Row justifyContent="between" alignItems="center" className="px-4 py-3 border-b border-border/20">
                    <Text className="text-white font-bold text-base">
                        Community Wallets {wallets.length > 0 && `(${wallets.length})`}
                    </Text>
                    <View className="w-8 h-8 justify-center items-center">
                        {(isManualRefreshing || isLoading) ? (
                            <ActivityIndicator size="small" color="#E75A5C" />
                        ) : (
                            <TouchableOpacity onPress={handleRefresh} className="p-2">
                                <Ionicons name="refresh" size={16} color="#E75A5C" />
                            </TouchableOpacity>
                        )}
                    </View>
                </Row>

                <View className="p-4">
                    {/* Error state */}
                    {error && (
                        <View className="mb-4 px-2">
                            <Text className="text-red-500 text-base mb-2">Error: {error}</Text>
                            <TouchableOpacity
                                className="bg-primary rounded-lg py-2 px-3 self-start"
                                onPress={handleRefresh}
                            >
                                <Text className="text-white text-sm font-medium">Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Wallets table - always visible if there are wallets */}
                    {wallets.length > 0 ? (
                        <ScrollView>
                            {/* Desktop view */}
                            {isDesktop ? (
                                <View>
                                    {/* Table headers */}
                                    <Row className="border-b border-border pb-2 mb-2">
                                        <View className="flex-1">
                                            <Text className="text-text-muted text-sm">Address</Text>
                                        </View>
                                        <View className="flex-2">
                                            <Text className="text-text-muted text-sm">Name</Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-text-muted text-sm text-right">Balance</Text>
                                        </View>
                                    </Row>

                                    {/* Table rows */}
                                    {wallets.map((wallet: CommunityWalletData) => (
                                        <Row key={wallet.address} className="py-2 border-b border-border/30">
                                            <View className="flex-1">
                                                <TouchableOpacity onPress={() => copyToClipboard(wallet.address)}>
                                                    <View className="flex-row items-center">
                                                        <Text className="text-text-light font-mono text-sm mr-1">
                                                            {formatAddressForDisplay(wallet.address, 6, 4)}
                                                        </Text>
                                                        <Ionicons name="copy-outline" size={14} color="#A0AEC0" />
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                            <View className="flex-2">
                                                <Text className="text-text-light text-sm">
                                                    {wallet.name || 'Community Wallet'}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-text-light font-mono text-sm text-right">
                                                    {formatBalance(wallet.balance || 0)}
                                                </Text>
                                            </View>
                                        </Row>
                                    ))}
                                </View>
                            ) : (
                                /* Mobile view - stacked cards */
                                <View className="space-y-3">
                                    {wallets.map((wallet: CommunityWalletData) => (
                                        <View
                                            key={wallet.address}
                                            className="bg-background/50 rounded-lg p-3 border border-border/30"
                                        >
                                            <TouchableOpacity onPress={() => copyToClipboard(wallet.address)}>
                                                <View className="flex-row items-center mb-2">
                                                    <Text className="text-text-light font-mono text-sm mr-1">
                                                        {formatAddressForDisplay(wallet.address, 6, 4)}
                                                    </Text>
                                                    <Ionicons name="copy-outline" size={14} color="#A0AEC0" />
                                                </View>
                                            </TouchableOpacity>

                                            <Text className="text-text-light text-base mb-1">
                                                {wallet.name || 'Community Wallet'}
                                            </Text>

                                            <Text className="text-text-light font-mono text-sm">
                                                {formatBalance(wallet.balance || 0)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    ) : (
                        /* Empty state */
                        <View className="py-6 items-center">
                            <Text className="text-white text-base text-center mb-4">
                                No community wallets found.
                            </Text>
                            <TouchableOpacity
                                className="bg-primary rounded-lg py-2 px-4"
                                onPress={handleRefresh}
                            >
                                <Text className="text-white">Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Copy success message */}
                    {copySuccess && (
                        <View className="absolute right-4 top-4 bg-green-800/80 px-2 py-1 rounded z-10">
                            <Text className="text-white text-xs">{copySuccess}</Text>
                        </View>
                    )}
                </View>
            </Card>
        </View>
    );
}); 