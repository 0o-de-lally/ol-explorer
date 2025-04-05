import React, { useEffect, useRef, useState } from 'react';
import {View, Text, ActivityIndicator, AppState, AppStateStatus, TouchableOpacity, Pressable, useWindowDimensions} from 'react-native';
import {observer} from '@legendapp/state/react';
import {observable} from '@legendapp/state';
import {blockchainStore, blockchainActions} from '../store/blockchainStore';
import {blockTimeStore} from '../store/blockTimeStore';
import {formatTimestamp} from '../utils/formatters';
import {useSdkContext} from '../context/SdkContext';
import {useForceUpdateMetrics} from '../hooks/useForceUpdate';
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
const MetricCard = ({ label, value, tooltip, isDesktop }: {
  label: string;
  value: string | number;
  tooltip: string;
  isDesktop: boolean;
}) => {
  // Determine if this is a timestamp (Ledger Time) by checking the label
  const isTimestamp = label === 'Ledger Time';

  return (
    <View
      className={`bg-[rgba(26,34,53,0.5)] rounded-lg p-3 ${isTimestamp && !isDesktop ? 'flex-grow-2' : 'flex-grow'}`}
    >
      <TooltipWrapper tooltip={tooltip}>
        <View>
          <Text className="text-text-muted text-xs mb-1">{label}</Text>
          <Text
            className={`text-text-light font-bold ${isTimestamp ? 'text-base' : 'text-lg'}`}
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
      </TooltipWrapper>
    </View>
  );
};

type MetricsValues = {
  blockTimeMs: number;
  tps: number;
  lastBlockHeight: number;
  currentLedgerTimestamp: number;
  currentBlockHeight: number;
  currentEpoch: number;
  chainId: string;
  highestVersion: number | null;
  highestBlockHeight: number;
  highestEpoch: number;
  latestLedgerTime: number;
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

// Render metrics rows
const MetricsGrid = ({
  metrics,
  values,
  isDesktop
}: {
  metrics: MetricRowConfig;
  values: MetricsValues;
  isDesktop: boolean;
}) => (
  <View className={`flex flex-row flex-wrap ${isDesktop ? 'gap-4' : 'gap-2'}`}>
    {Object.entries(metrics)
      .filter(([_, config]) => config.enabled)
      .map(([key, config]) => (
        <View key={key} className={`${isDesktop ? 'w-[23%]' : 'w-[48%]'} mb-2`}>
          <MetricCard
            label={config.label}
            value={getMetricValue(key, values)}
            tooltip={config.tooltip}
            isDesktop={isDesktop}
          />
        </View>
      ))}
  </View>
);

// Use the observer HOC to automatically handle observables
export const BlockchainMetrics = observer(({ isVisible = true }: BlockchainMetricsProps) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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

  return (
    <View className="w-full mb-5">
      <View className="bg-secondary/90 rounded-lg overflow-hidden backdrop-blur-lg">
        <View className="h-1 bg-primary/20" />
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isDesktop ? 16 : 12,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(30, 39, 54, 0.2)'
        }}>
          <Text style={{
            fontSize: isDesktop ? 18 : 16,
            fontWeight: 'bold',
            color: 'white'
          }}>
            Blockchain Metrics
          </Text>
          <View className="w-8 h-8 justify-center items-center">
            {(loading || isAutoRefreshing || !isInitialized) ? (
              <ActivityIndicator size="small" color="#E75A5C" />
            ) : (
              <TouchableOpacity onPress={handleAutoRefresh} className="p-2">
                <Text className="text-primary">Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{
          padding: isDesktop ? 16 : 12,
          gap: isDesktop ? 16 : 8
        }}>
          <MetricsGrid
            metrics={{
              ...appConfig.metrics.display.row1,
              ...appConfig.metrics.display.row2
            }}
            values={values}
            isDesktop={isDesktop}
          />
        </View>
      </View>
    </View>
  );
}); 