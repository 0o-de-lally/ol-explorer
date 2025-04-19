import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { observer } from '@legendapp/state/react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Row, Column } from '../Layout';
import { useVouching } from '../../hooks/useVouching';
import { VouchInfo } from '../../hooks/useSdk';
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
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    // Use our custom hook
    const {
        vouchesOutbound,
        vouchesInbound,
        pageRankScore,
        isLoading,
        error,
        refresh,
        currentEpoch
    } = useVouching(accountAddress, isVisible);

    // Sort vouches consistently with the new sorting rules:
    // 1. Active vouches at the top
    // 2. Active vouches sorted oldest to newest (increasing epoch)
    // 3. Expired vouches sorted newest to oldest (decreasing epoch)
    const sortedOutboundVouches = useMemo(() => {
        if (!currentEpoch || currentEpoch <= 0) {
            // If we don't have epoch data yet, just sort by epoch (newest first)
            return [...vouchesOutbound].sort((a, b) => b.epoch - a.epoch);
        }

        const expiryWindow = appConfig.vouching.expiryWindow;
        return [...vouchesOutbound].sort((a, b) => {
            const aExpired = (a.epoch + expiryWindow) <= currentEpoch;
            const bExpired = (b.epoch + expiryWindow) <= currentEpoch;

            // If active status is different, active ones go first
            if (aExpired !== bExpired) {
                return aExpired ? 1 : -1; // Active (not expired) first
            }

            // Both active or both expired
            if (!aExpired) {
                // Both active - sort by oldest to newest (increasing epoch)
                if (a.epoch !== b.epoch) {
                    return a.epoch - b.epoch;
                }
            } else {
                // Both expired - sort by newest to oldest (decreasing epoch)
                if (a.epoch !== b.epoch) {
                    return b.epoch - a.epoch;
                }
            }

            // If epochs are the same, sort by address
            return a.address.localeCompare(b.address);
        });
    }, [vouchesOutbound, currentEpoch]);

    const sortedInboundVouches = useMemo(() => {
        if (!currentEpoch || currentEpoch <= 0) {
            // If we don't have epoch data yet, just sort by epoch (newest first)
            return [...vouchesInbound].sort((a, b) => b.epoch - a.epoch);
        }

        const expiryWindow = appConfig.vouching.expiryWindow;
        return [...vouchesInbound].sort((a, b) => {
            const aExpired = (a.epoch + expiryWindow) <= currentEpoch;
            const bExpired = (b.epoch + expiryWindow) <= currentEpoch;

            // If active status is different, active ones go first
            if (aExpired !== bExpired) {
                return aExpired ? 1 : -1; // Active (not expired) first
            }

            // Both active or both expired
            if (!aExpired) {
                // Both active - sort by oldest to newest (increasing epoch)
                if (a.epoch !== b.epoch) {
                    return a.epoch - b.epoch;
                }
            } else {
                // Both expired - sort by newest to oldest (decreasing epoch)
                if (a.epoch !== b.epoch) {
                    return b.epoch - a.epoch;
                }
            }

            // If epochs are the same, sort by address
            return a.address.localeCompare(b.address);
        });
    }, [vouchesInbound, currentEpoch]);

    // Calculate active vouches (not expired) counts
    const { activeOutboundCount, activeInboundCount } = useMemo(() => {
        if (!currentEpoch || currentEpoch <= 0) {
            return {
                activeOutboundCount: sortedOutboundVouches.length,
                activeInboundCount: sortedInboundVouches.length
            };
        }

        const expiryWindow = appConfig.vouching.expiryWindow;

        const activeOutbound = sortedOutboundVouches.filter(v =>
            (v.epoch + expiryWindow) > currentEpoch
        );

        const activeInbound = sortedInboundVouches.filter(v =>
            (v.epoch + expiryWindow) > currentEpoch
        );

        return {
            activeOutboundCount: activeOutbound.length,
            activeInboundCount: activeInbound.length
        };
    }, [sortedOutboundVouches, sortedInboundVouches, currentEpoch]);

    // Add effect to auto-refresh when component becomes visible
    useEffect(() => {
        if (isVisible && !isLoading) {
            // Small delay to let other components load first
            const timer = setTimeout(() => {
                refresh();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    // Handle refresh with loading indicator
    const handleRefresh = async () => {
        setIsManualRefreshing(true);
        try {
            await refresh();
        } finally {
            setIsManualRefreshing(false);
        }
    };

    // Helper to format address for display
    const formatAddressForDisplay = (address: string): string => {
        if (!address) return '';
        if (address.length <= 10) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    // Navigate to account details
    const navigateToAccount = (address: string | VouchInfo) => {
        const addressStr = typeof address === 'string' ? address : address.address;
        router.push(`/account/${addressStr}`);
    };

    // Navigate to view function
    const navigateToViewFunction = (functionName: string, args?: string) => {
        const path = `${appConfig.network.OL_FRAMEWORK}::vouch::${functionName}`;
        let queryParams: any = {
            initialPath: encodeURIComponent(path)
        };

        if (args) {
            queryParams.initialArgs = encodeURIComponent(args);
        }

        router.push({
            pathname: '/view',
            params: queryParams
        });
    };

    // Check if we have actual data to display
    const hasData = vouchesOutbound.length > 0 || vouchesInbound.length > 0;
    const initialLoading = isLoading && !hasData;

    return (
        <Card className="mb-4">
            <Row justifyContent="between" alignItems="center" className="mb-3">
                <Text className="text-text-light text-base font-bold">Vouching Network</Text>
                <TouchableOpacity
                    onPress={handleRefresh}
                    className="p-1.5 bg-primary rounded-md flex items-center justify-center"
                    disabled={isManualRefreshing}
                >
                    {isManualRefreshing ? (
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
                    <TouchableOpacity
                        onPress={handleRefresh}
                        className="bg-red-800/30 rounded-md p-2 mt-2 self-start"
                    >
                        <Text className="text-white text-xs">Try Again</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Show loading indicator only for initial load */}
            {initialLoading && (
                <View className="items-center justify-center py-6">
                    <ActivityIndicator size="large" color="#E75A5C" />
                    <Text className="text-white mt-3 text-sm">Loading vouching data...</Text>
                </View>
            )}

            {/* Always show content if available, even during refresh */}
            {(!initialLoading || hasData) && (
                <>
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

                        {/* Informational section about vouching expiry */}
                        <View className="bg-blue-900/30 rounded-md p-3 mb-4">
                            <Text className="text-blue-300 text-sm">
                                {currentEpoch > 0
                                    ? `Vouches expire after ${appConfig.vouching.expiryWindow} epochs. Current epoch: ${currentEpoch}.`
                                    : `Vouches expire after ${appConfig.vouching.expiryWindow} epochs. Fetching current epoch...`
                                }
                            </Text>
                            <Text className="text-blue-300 text-xs mt-1 mb-2">
                                {currentEpoch > 0
                                    ? `Vouches given at epoch ${Math.max(0, currentEpoch - appConfig.vouching.expiryWindow)} or earlier have expired.`
                                    : 'Loading epoch data to calculate expiration status...'
                                }
                            </Text>
                            <View className="flex-row mt-2 space-x-2">
                                <View className="flex-row items-center">
                                    <View className="w-3 h-3 rounded-full bg-green-800 mr-1" />
                                    <Text className="text-blue-300 text-xs">Active</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <View className="w-3 h-3 rounded-full bg-yellow-800 mr-1" />
                                    <Text className="text-blue-300 text-xs">Expiring Soon</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <View className="w-3 h-3 rounded-full bg-red-800 mr-1" />
                                    <Text className="text-blue-300 text-xs">Expired</Text>
                                </View>
                            </View>
                        </View>

                        {/* Helper function to determine vouch status */}
                        {(() => {
                            // Calculate the expiry status of a vouch
                            const getVouchStatusInfo = (vouchEpoch: number, currentEpoch: number) => {
                                // If epoch not available or invalid, show as pending by default
                                if (!currentEpoch || currentEpoch <= 0) {
                                    return {
                                        bgColor: 'bg-blue-900/30',
                                        textColor: 'text-blue-300',
                                        statusText: 'Status Pending',
                                        epochsText: 'Waiting for epoch data...',
                                        isExpired: false
                                    };
                                }

                                const expiryWindow = appConfig.vouching.expiryWindow;
                                const expiryEpoch = vouchEpoch + expiryWindow;
                                const epochsRemaining = expiryEpoch - currentEpoch;
                                const warningThreshold = appConfig.vouching.warningThreshold;

                                // Determine status colors and text
                                if (epochsRemaining <= 0) {
                                    return {
                                        bgColor: 'bg-red-900/30',
                                        textColor: 'text-red-300',
                                        statusText: 'Expired',
                                        epochsText: 'Expired',
                                        isExpired: true
                                    };
                                } else if (epochsRemaining <= warningThreshold) {
                                    return {
                                        bgColor: 'bg-yellow-900/30',
                                        textColor: 'text-yellow-300',
                                        statusText: 'Expiring Soon',
                                        epochsText: `${epochsRemaining} epochs left`,
                                        isExpired: false
                                    };
                                } else {
                                    return {
                                        bgColor: 'bg-green-900/30',
                                        textColor: 'text-green-300',
                                        statusText: 'Active',
                                        epochsText: `${epochsRemaining} epochs left`,
                                        isExpired: false
                                    };
                                }
                            };

                            return (
                                <>
                                    {/* Accounts this account vouches for (Given Vouches) */}
                                    <View className="mb-4">
                                        <TouchableOpacity
                                            onPress={() => navigateToViewFunction(
                                                'get_given_vouches',
                                                `"${accountAddress}"`
                                            )}
                                            className="mb-2"
                                        >
                                            <Text className="text-text-light text-sm font-medium">
                                                Given Vouches ({activeOutboundCount}/{sortedOutboundVouches.length})
                                            </Text>
                                        </TouchableOpacity>

                                        {sortedOutboundVouches.length > 0 ? (
                                            <View className="border border-border/30 rounded-md overflow-hidden">
                                                {sortedOutboundVouches.map((vouchInfo, index) => {
                                                    const statusInfo = getVouchStatusInfo(vouchInfo.epoch, currentEpoch);
                                                    return (
                                                        <TouchableOpacity
                                                            key={`outbound-${vouchInfo.address}-${vouchInfo.epoch}`}
                                                            onPress={() => navigateToAccount(vouchInfo)}
                                                            className={`p-2 ${index !== sortedOutboundVouches.length - 1 ? 'border-b border-border/30' : ''} ${statusInfo.bgColor}`}
                                                        >
                                                            <Row justifyContent="between" alignItems="center">
                                                                <Text className="text-white text-sm font-mono">
                                                                    {isDesktop ? vouchInfo.address : formatAddressForDisplay(vouchInfo.address)}
                                                                </Text>
                                                                <View className="flex-row items-center">
                                                                    <Text className={`text-xs ${statusInfo.textColor} mr-2`}>
                                                                        {statusInfo.epochsText}
                                                                    </Text>
                                                                    <View className={`px-1.5 py-0.5 rounded-md ${statusInfo.isExpired ? 'bg-red-800' : 'bg-gray-800'}`}>
                                                                        <Text className="text-white text-xs">
                                                                            Epoch {vouchInfo.epoch}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            </Row>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        ) : (
                                            <Text className="text-text-light text-sm italic">
                                                No vouches given
                                            </Text>
                                        )}
                                    </View>

                                    {/* Accounts that vouch for this account (Received Vouches) */}
                                    <View>
                                        <TouchableOpacity
                                            onPress={() => navigateToViewFunction(
                                                'get_received_vouches',
                                                `"${accountAddress}"`
                                            )}
                                            className="mb-2"
                                        >
                                            <Text className="text-text-light text-sm font-medium">
                                                Received Vouches ({activeInboundCount}/{sortedInboundVouches.length})
                                            </Text>
                                        </TouchableOpacity>

                                        {sortedInboundVouches.length > 0 ? (
                                            <View className="border border-border/30 rounded-md overflow-hidden">
                                                {sortedInboundVouches.map((vouchInfo, index) => {
                                                    const statusInfo = getVouchStatusInfo(vouchInfo.epoch, currentEpoch);
                                                    return (
                                                        <TouchableOpacity
                                                            key={`inbound-${vouchInfo.address}-${vouchInfo.epoch}`}
                                                            onPress={() => navigateToAccount(vouchInfo)}
                                                            className={`p-2 ${index !== sortedInboundVouches.length - 1 ? 'border-b border-border/30' : ''} ${statusInfo.bgColor}`}
                                                        >
                                                            <Row justifyContent="between" alignItems="center">
                                                                <Text className="text-white text-sm font-mono">
                                                                    {isDesktop ? vouchInfo.address : formatAddressForDisplay(vouchInfo.address)}
                                                                </Text>
                                                                <View className="flex-row items-center">
                                                                    <Text className={`text-xs ${statusInfo.textColor} mr-2`}>
                                                                        {statusInfo.epochsText}
                                                                    </Text>
                                                                    <View className={`px-1.5 py-0.5 rounded-md ${statusInfo.isExpired ? 'bg-red-800' : 'bg-gray-800'}`}>
                                                                        <Text className="text-white text-xs">
                                                                            Epoch {vouchInfo.epoch}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            </Row>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        ) : (
                                            <Text className="text-text-light text-sm italic">
                                                No vouches received
                                            </Text>
                                        )}
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </>
            )}
        </Card>
    );
}); 