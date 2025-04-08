import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, AppState, AppStateStatus, TouchableOpacity, useWindowDimensions } from 'react-native';
import { observer } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { useSdk } from '../hooks/useSdk';
import { useSdkContext } from '../context/SdkContext';
import { SupplyStats as SupplyStatsType } from '../hooks/useSdk';
import appConfig from '../config/appConfig';
import tokenConfig from '../config/tokenConfig';

// Use polling interval from config
const AUTO_REFRESH_INTERVAL = appConfig.metrics.calculations.updateInterval;

// Get token decimals from config
const TOKEN_DECIMALS = tokenConfig.tokens.libraToken.decimals;

// Create observable state for supply stats
const supplyStore = observable({
    stats: {
        total: 0,
        slowLocked: 0,
        donorVoice: 0,
        pledge: 0,
        unlocked: 0
    },
    isLoading: false,
    error: null as string | null,
    lastUpdated: 0
});

// Format a coin amount with proper token decimals
const formatLibraAmount = (amount: number): string => {
    if (!amount && amount !== 0) return '-';

    // Convert to human-readable format with configured decimal places
    const divisor = Math.pow(10, TOKEN_DECIMALS);
    const value = amount / divisor;

    // Format with commas for thousands and fixed decimal places
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }) + ` ${tokenConfig.tokens.libraToken.symbol}`;
};

// Metric card component for consistent styling
const StatCard = ({ label, value, isDesktop, fullWidth = false }: {
    label: string;
    value: string;
    isDesktop: boolean;
    fullWidth?: boolean;
}) => {
    return (
        <View className={`bg-background/50 rounded-lg p-3 ${fullWidth ? 'w-full' : 'flex-1'}`}>
            <Text className="text-text-muted text-xs mb-1">{label}</Text>
            <Text className="text-text-light font-bold text-base">
                {value}
            </Text>
        </View>
    );
};

type SupplyStatsProps = {
    isVisible?: boolean;
};

export const SupplyStats = observer(({ isVisible = true }: SupplyStatsProps) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const sdk = useSdk();
    const { isInitialized } = useSdkContext();
    const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const appState = useRef(AppState.currentState);
    const isMounted = useRef(true);

    // Set isMounted ref on mount/unmount
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Listen for app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => { subscription.remove(); };
    }, []);

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            if (isVisible && isInitialized) {
                handleRefresh();
            }
        }
        appState.current = nextAppState;
    };

    // Polling setup
    useEffect(() => {
        if (isVisible && isInitialized) {
            startPolling();
            // Initial fetch when component mounts or becomes visible
            fetchSupplyStats();
        } else {
            stopPolling();
        }
        return () => { stopPolling(); };
    }, [isVisible, isInitialized]);

    const startPolling = () => {
        if (!pollingIntervalRef.current && isVisible && isInitialized) {
            pollingIntervalRef.current = setInterval(() => {
                if (!isAutoRefreshing && isVisible && isMounted.current) {
                    fetchSupplyStats();
                }
            }, AUTO_REFRESH_INTERVAL);
        }
    };

    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    const fetchSupplyStats = async () => {
        try {
            setIsAutoRefreshing(true);
            supplyStore.isLoading.set(true);

            const stats = await sdk.getSupplyStats();

            if (isMounted.current) {
                supplyStore.stats.set(stats);
                supplyStore.lastUpdated.set(Date.now());
                supplyStore.error.set(null);
            }
        } catch (error) {
            console.error('Error fetching supply stats:', error);
            if (isMounted.current) {
                supplyStore.error.set(error instanceof Error ? error.message : 'Unknown error');
            }
        } finally {
            if (isMounted.current) {
                supplyStore.isLoading.set(false);
                setTimeout(() => setIsAutoRefreshing(false), 500);
            }
        }
    };

    const handleRefresh = () => {
        if (!isAutoRefreshing && isInitialized) {
            fetchSupplyStats();
        }
    };

    // Get the stats from the store
    const stats = supplyStore.stats.get();
    const isLoading = supplyStore.isLoading.get();
    const error = supplyStore.error.get();

    return (
        <View className="w-full mb-5">
            <View className="bg-secondary/90 rounded-lg overflow-hidden backdrop-blur-lg">
                <View className="h-1 bg-primary/20" />
                <View className="flex-row justify-between items-center px-4 py-3 border-b border-border/20">
                    <Text className="text-white font-bold text-base">Supply Statistics</Text>
                    <View className="w-8 h-8 justify-center items-center">
                        {(isLoading || isAutoRefreshing || !isInitialized) ? (
                            <ActivityIndicator size="small" color="#E75A5C" />
                        ) : (
                            <TouchableOpacity onPress={handleRefresh} className="p-2">
                                <Text className="text-primary">Refresh</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View className="p-4">
                    {error ? (
                        <Text className="text-red-500 text-sm">{error}</Text>
                    ) : (
                        <View>
                            {/* Desktop layout */}
                            {isDesktop ? (
                                <>
                                    {/* First row - Total and Unlocked */}
                                    <View className="flex-row gap-2 mb-2">
                                        <StatCard
                                            label="Total Supply"
                                            value={formatLibraAmount(stats.total)}
                                            isDesktop={isDesktop}
                                        />
                                        <StatCard
                                            label="Unlocked"
                                            value={formatLibraAmount(stats.unlocked)}
                                            isDesktop={isDesktop}
                                        />
                                    </View>

                                    {/* Second row - Slow Locked, Donor Voice, Pledge */}
                                    <View className="flex-row gap-2">
                                        <StatCard
                                            label="Slow Wallet Locked"
                                            value={formatLibraAmount(stats.slowLocked)}
                                            isDesktop={isDesktop}
                                        />
                                        <StatCard
                                            label="Donor Voice"
                                            value={formatLibraAmount(stats.donorVoice)}
                                            isDesktop={isDesktop}
                                        />
                                        <StatCard
                                            label="Pledge"
                                            value={formatLibraAmount(stats.pledge)}
                                            isDesktop={isDesktop}
                                        />
                                    </View>
                                </>
                            ) : (
                                /* Mobile layout - one stat per row */
                                <View className="flex-col gap-2">
                                    <StatCard
                                        label="Total Supply"
                                        value={formatLibraAmount(stats.total)}
                                        isDesktop={isDesktop}
                                        fullWidth={true}
                                    />
                                    <StatCard
                                        label="Unlocked"
                                        value={formatLibraAmount(stats.unlocked)}
                                        isDesktop={isDesktop}
                                        fullWidth={true}
                                    />
                                    <StatCard
                                        label="Slow Wallet Locked"
                                        value={formatLibraAmount(stats.slowLocked)}
                                        isDesktop={isDesktop}
                                        fullWidth={true}
                                    />
                                    <StatCard
                                        label="Donor Voice"
                                        value={formatLibraAmount(stats.donorVoice)}
                                        isDesktop={isDesktop}
                                        fullWidth={true}
                                    />
                                    <StatCard
                                        label="Pledge"
                                        value={formatLibraAmount(stats.pledge)}
                                        isDesktop={isDesktop}
                                        fullWidth={true}
                                    />
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}); 