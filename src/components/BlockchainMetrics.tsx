import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, AppState, AppStateStatus, TouchableOpacity, Pressable } from 'react-native';
import { observer } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { blockchainStore, blockchainActions } from '../store/blockchainStore';
import { blockTimeStore } from '../store/blockTimeStore';
import { formatTimestamp } from '../utils/formatters';
import { useSdkContext } from '../context/SdkContext';
import { useForceUpdateMetrics } from '../hooks/useForceUpdate';
import appConfig from '../config/appConfig';

// Use polling interval from config
const AUTO_REFRESH_INTERVAL = appConfig.metrics.calculations.updateInterval;

const formatBlockTime = (ms: number) => {
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '-';
  return Number(num).toLocaleString();
};

// Types for metric configuration
type MetricConfig = {
  enabled: boolean;
  label: string;
  tooltip: string;
};

type MetricRowConfig = {
  [key: string]: MetricConfig;
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

// Simple tooltip component that shows tooltip text on press
const TooltipWrapper = ({ children, tooltip }: { children: React.ReactNode; tooltip: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Pressable
      onPressIn={() => setShowTooltip(true)}
      onPressOut={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <View className="absolute bottom-full left-0 right-0 mb-2 px-2 py-1 bg-gray-800 rounded">
          <Text className="text-white text-xs">{tooltip}</Text>
        </View>
      )}
    </Pressable>
  );
};

// Metric card component for consistent styling
const MetricCard = ({ label, value, tooltip }: { label: string; value: string | number; tooltip: string }) => {
  // Determine if this is a timestamp (Ledger Time) by checking the label
  const isTimestamp = label === 'Ledger Time';

  return (
    <View className={`bg-secondary/50 rounded-lg p-4 backdrop-blur-sm flex-1 ${isTimestamp ? 'min-w-[280px] max-w-[400px]' : 'min-w-[140px] max-w-[200px]'
      }`}>
      <TooltipWrapper tooltip={tooltip}>
        <View>
          <Text className="text-text-muted text-xs mb-2">{label}</Text>
          <Text
            className={`text-text-light font-bold ${isTimestamp ? 'text-lg' : 'text-xl'
              }`}
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
      </TooltipWrapper>
    </View>
  );
};

// Helper to get metric value
const getMetricValue = (key: string, values: any) => {
  switch (key) {
    case 'latestVersion':
      return formatNumber(values.highestVersion);
    case 'blockHeight':
      return formatNumber(values.highestBlockHeight);
    case 'epoch':
      return formatNumber(values.highestEpoch);
    case 'chainId':
      return values.chainId;
    case 'blockTime':
      return values.blockTimeMs > 0 ? formatBlockTime(values.blockTimeMs) : 'Calculating...';
    case 'tps':
      return values.tps > 0 ? values.tps.toFixed(2) : 'Calculating...';
    case 'ledgerTime':
      return values.latestLedgerTime > 0 ? formatTimestamp(values.latestLedgerTime) : 'Loading...';
    default:
      return '-';
  }
};

// Use the observer HOC to automatically handle observables
export const BlockchainMetrics = observer(({ isVisible = true }: BlockchainMetricsProps) => {
  const updateCounter = useForceUpdateMetrics();
  const { isInitialized } = useSdkContext();
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);

  // Access primitive values from observables
  const values = {
    blockTimeMs: Number(blockTimeStore.blockTimeMs.get() ?? 0),
    tps: Number(blockTimeStore.tps.get() ?? 0),
    lastBlockHeight: Number(blockTimeStore.lastBlockHeight.get() ?? 0),
    currentLedgerTimestamp: Number(blockTimeStore.lastBlockTimestamp.get() ?? 0),
    currentBlockHeight: Number(blockchainStore.stats.blockHeight.get() ?? 0),
    currentEpoch: Number(blockchainStore.stats.epoch.get() ?? 0),
    chainId: blockchainStore.stats.chainId.get() || '-',
    highestVersion: metricsStore.highestVersion.get(),
    highestBlockHeight: metricsStore.highestBlockHeight.get(),
    highestEpoch: metricsStore.highestEpoch.get(),
    latestLedgerTime: metricsStore.latestLedgerTime.get()
  };

  const loading = blockchainStore.isMetricsLoading.get() || !isInitialized;

  // Get latest transaction version from transactions if available
  const transactions = blockchainStore.transactions.get();
  const currentLatestVersion = transactions && transactions.length > 0 ?
    Number(transactions[0].version) : null;

  // Effect handlers...
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => { subscription.remove(); };
  }, []);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      if (isVisible && isInitialized) {
        handleAutoRefresh();
      }
    }
    appState.current = nextAppState;
  };

  // Polling setup...
  useEffect(() => {
    if (isVisible) {
      setIsAutoRefreshing(false);
      startPolling();
    } else {
      stopPolling();
    }
    return () => { stopPolling(); };
  }, [isVisible, isInitialized]);

  const startPolling = () => {
    if (!pollingIntervalRef.current && isVisible && isInitialized) {
      setIsAutoRefreshing(false);
      pollingIntervalRef.current = setInterval(() => {
        if (!isAutoRefreshing && isVisible && isMounted.current) {
          handleAutoRefresh();
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

  const handleAutoRefresh = async () => {
    try {
      setIsAutoRefreshing(true);
      blockchainActions.forceUpdateMetrics();
    } catch (error) {
      console.error('Error during metrics auto-refresh:', error);
    } finally {
      if (isMounted.current) {
        setTimeout(() => setIsAutoRefreshing(false), 500);
      }
    }
  };

  // Update highest values effects...
  useEffect(() => {
    if (currentLatestVersion !== null &&
      (values.highestVersion === null || values.highestVersion === 0 || currentLatestVersion > values.highestVersion)) {
      metricsStore.highestVersion.set(currentLatestVersion);
    }
  }, [currentLatestVersion, values.highestVersion]);

  useEffect(() => {
    if (values.currentBlockHeight > 0 &&
      (values.highestBlockHeight === 0 || values.currentBlockHeight > values.highestBlockHeight)) {
      metricsStore.highestBlockHeight.set(values.currentBlockHeight);
    }
  }, [values.currentBlockHeight, values.highestBlockHeight]);

  useEffect(() => {
    if (values.currentEpoch > 0 &&
      (values.highestEpoch === 0 || values.currentEpoch > values.highestEpoch)) {
      metricsStore.highestEpoch.set(values.currentEpoch);
    }
  }, [values.currentEpoch, values.highestEpoch]);

  useEffect(() => {
    if (values.currentLedgerTimestamp > 0 &&
      (values.latestLedgerTime === 0 || values.currentLedgerTimestamp > values.latestLedgerTime)) {
      metricsStore.latestLedgerTime.set(values.currentLedgerTimestamp);
    }
  }, [values.currentLedgerTimestamp, values.latestLedgerTime]);

  // Render metrics rows
  const renderMetricRow = (rowConfig: MetricRowConfig) => (
    <View className="flex-row gap-4 justify-center">
      {Object.entries(rowConfig)
        .filter(([_, config]) => config.enabled)
        .map(([key, config]) => (
          <MetricCard
            key={key}
            label={config.label}
            value={getMetricValue(key, values)}
            tooltip={config.tooltip}
          />
        ))}
    </View>
  );

  return (
    <View className="mx-auto w-full max-w-screen-lg px-4 mb-5">
      <View className="bg-secondary/90 rounded-lg overflow-hidden backdrop-blur-lg">
        <View className="h-1 bg-primary/20" />
        <View className="flex-row justify-between items-center p-4 border-b border-border/20">
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

        <View className="p-4 space-y-4">
          {renderMetricRow(appConfig.metrics.display.row1)}
          {renderMetricRow(appConfig.metrics.display.row2)}
        </View>
      </View>
    </View>
  );
}); 