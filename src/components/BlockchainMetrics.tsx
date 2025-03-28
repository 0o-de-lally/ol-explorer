import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, AppState, AppStateStatus, TouchableOpacity } from 'react-native';
import { observer } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { blockchainStore, blockchainActions } from '../store/blockchainStore';
import { blockTimeStore } from '../store/blockTimeStore';
import { formatTimestamp } from '../utils/formatters';
import { useSdkContext } from '../context/SdkContext';
import { useForceUpdateMetrics } from '../hooks/useForceUpdate';

// Add polling interval constant to match other components
const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

const formatBlockTime = (ms: number) => {
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '-';
  return Number(num).toLocaleString();
};

// Create observable state for highest values
const metricsStore = observable({
  highestVersion: null as number | null,
  highestBlockHeight: 0,
  highestEpoch: 0,
  latestLedgerTime: 0,
});

// Add props type for BlockchainMetrics
type BlockchainMetricsProps = {
  isVisible?: boolean;
};

// Use the observer HOC to automatically handle observables
export const BlockchainMetrics = observer(({ isVisible = true }: BlockchainMetricsProps) => {
  // Force component to update on SDK changes - use metrics-specific hook
  const updateCounter = useForceUpdateMetrics();
  const { isInitialized } = useSdkContext();
  
  // Add state for auto-refreshing
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  
  // Add refs for tracking polling and app state
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);

  // Access primitive values from observables
  const blockTimeMsValue = Number(blockTimeStore.blockTimeMs.get() ?? 0);
  const tpsValue = Number(blockTimeStore.tps.get() ?? 0);
  const lastBlockHeightValue = Number(blockTimeStore.lastBlockHeight.get() ?? 0);
  const currentLedgerTimestamp = Number(blockTimeStore.lastBlockTimestamp.get() ?? 0);
  const currentBlockHeight = Number(blockchainStore.stats.blockHeight.get() ?? 0);
  const currentEpoch = Number(blockchainStore.stats.epoch.get() ?? 0);
  const chainIdValue = blockchainStore.stats.chainId.get() || '-';
  const isLoadingValue = blockchainStore.isMetricsLoading.get();
  const loading = isLoadingValue || !isInitialized;

  // Get highest values from our store
  const highestVersion = metricsStore.highestVersion.get();
  const highestBlockHeight = metricsStore.highestBlockHeight.get();
  const highestEpoch = metricsStore.highestEpoch.get();
  const latestLedgerTime = metricsStore.latestLedgerTime.get();

  // Get latest transaction version from transactions if available
  const transactions = blockchainStore.transactions.get();
  const currentLatestVersion = transactions && transactions.length > 0 ?
    Number(transactions[0].version) : null;

  // Set isMounted ref on mount/unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      console.log('App has come to the foreground, refreshing blockchain metrics');
      if (isVisible && isInitialized) {
        handleAutoRefresh();
      }
    }
    appState.current = nextAppState;
  };

  // Set up and clean up polling based on visibility
  useEffect(() => {
    // Create or destroy polling interval based on visibility
    if (isVisible) {
      // Reset any lingering auto-refresh state
      setIsAutoRefreshing(false);
      startPolling();
    } else {
      stopPolling();
    }

    // Clean up polling on unmount
    return () => {
      stopPolling();
    };
  }, [isVisible, isInitialized]);

  // Start polling interval
  const startPolling = () => {
    // Only start polling if not already polling and component is visible
    if (!pollingIntervalRef.current && isVisible && isInitialized) {
      console.log('Starting polling for blockchain metrics');
      
      // Reset any lingering auto-refresh state
      setIsAutoRefreshing(false);
      
      pollingIntervalRef.current = setInterval(() => {
        // Only poll if we're not already refreshing and component is still visible and mounted
        if (!isAutoRefreshing && isVisible && isMounted.current) {
          console.log('Auto-refreshing blockchain metrics');
          handleAutoRefresh();
        }
      }, AUTO_REFRESH_INTERVAL);
    }
  };

  // Stop polling interval
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('Stopping polling for blockchain metrics');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Handle auto-refresh
  const handleAutoRefresh = async () => {
    // Always allow manual refresh, even if auto-refresh is running
    try {
      setIsAutoRefreshing(true);
      
      // Trigger store updates using the metrics-specific action
      blockchainActions.forceUpdateMetrics();
      
      console.log('Auto-refreshed blockchain metrics');
    } catch (error) {
      console.error('Error during metrics auto-refresh:', error);
    } finally {
      if (isMounted.current) {
        setTimeout(() => {
          setIsAutoRefreshing(false);
        }, 500); // Short delay to ensure the user sees the refresh indicator
      }
    }
  };

  // Update highest values if current values are higher or initial values
  useEffect(() => {
    if (currentLatestVersion !== null && 
        (highestVersion === null || highestVersion === 0 || currentLatestVersion > highestVersion)) {
      metricsStore.highestVersion.set(currentLatestVersion);
    }
  }, [currentLatestVersion, highestVersion]);

  useEffect(() => {
    if (currentBlockHeight > 0 && 
        (highestBlockHeight === 0 || highestBlockHeight === null || highestBlockHeight === undefined || 
         currentBlockHeight > highestBlockHeight)) {
      metricsStore.highestBlockHeight.set(currentBlockHeight);
    }
  }, [currentBlockHeight, highestBlockHeight]);

  useEffect(() => {
    if (currentEpoch > 0 && 
        (highestEpoch === 0 || highestEpoch === null || highestEpoch === undefined || 
         currentEpoch > highestEpoch)) {
      metricsStore.highestEpoch.set(currentEpoch);
    }
  }, [currentEpoch, highestEpoch]);

  useEffect(() => {
    if (currentLedgerTimestamp > 0 && 
        (latestLedgerTime === 0 || latestLedgerTime === null || latestLedgerTime === undefined || 
         currentLedgerTimestamp > latestLedgerTime)) {
      metricsStore.latestLedgerTime.set(currentLedgerTimestamp);
    }
  }, [currentLedgerTimestamp, latestLedgerTime]);

  return (
    <View className="mx-auto w-full max-w-screen-lg px-4 mb-5">
      <View className="bg-secondary rounded-lg overflow-hidden">
        <View className="h-1 bg-white/10" />
        <View className="flex-row justify-between items-center p-4 border-b border-border">
          <Text className="text-lg font-bold text-white">
            Blockchain Metrics
          </Text>
          {(loading || isAutoRefreshing || !isInitialized) ? (
            <ActivityIndicator size="small" color="#E75A5C" />
          ) : (
            <TouchableOpacity onPress={handleAutoRefresh} className="p-2">
              <Text className="text-primary">Refresh</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row justify-around flex-wrap p-4">
          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Latest Version</Text>
            <Text className="text-text-light text-base font-bold text-center" data-testid="latest-version">
              {formatNumber(highestVersion)}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Block Height</Text>
            <Text className="text-text-light text-base font-bold text-center" testID="block-height-value">
              {formatNumber(highestBlockHeight)}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Epoch</Text>
            <Text className="text-text-light text-base font-bold text-center">
              {formatNumber(highestEpoch)}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Chain ID</Text>
            <Text className="text-text-light text-base font-bold text-center">
              {chainIdValue}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Block Time</Text>
            <Text className="text-text-light text-base font-bold text-center" testID="block-time-value">
              {blockTimeMsValue > 0 ? formatBlockTime(blockTimeMsValue) : 'Calculating...'}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">TPS</Text>
            <Text className="text-text-light text-base font-bold text-center" testID="tps-value">
              {tpsValue > 0 ? tpsValue.toFixed(2) : 'Calculating...'}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Ledger Time</Text>
            <Text className="text-text-light text-base font-bold text-center">
              {latestLedgerTime > 0 ? formatTimestamp(latestLedgerTime) : 'Loading...'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}); 