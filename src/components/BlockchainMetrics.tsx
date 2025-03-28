import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { observer } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { blockchainStore } from '../store/blockchainStore';
import { blockTimeStore } from '../store/blockTimeStore';
import { formatTimestamp } from '../utils/formatters';
import { useSdkContext } from '../context/SdkContext';
import { useForceUpdate } from '../hooks/useForceUpdate';

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

// Use the observer HOC to automatically handle observables
export const BlockchainMetrics = observer(() => {
  // Force component to update on SDK changes
  const updateCounter = useForceUpdate();
  const { isInitialized } = useSdkContext();

  // Access primitive values from observables
  const blockTimeMsValue = Number(blockTimeStore.blockTimeMs.get() ?? 0);
  const lastBlockHeightValue = Number(blockTimeStore.lastBlockHeight.get() ?? 0);
  const currentLedgerTimestamp = Number(blockTimeStore.lastBlockTimestamp.get() ?? 0);
  const currentBlockHeight = Number(blockchainStore.stats.blockHeight.get() ?? 0);
  const currentEpoch = Number(blockchainStore.stats.epoch.get() ?? 0);
  const chainIdValue = blockchainStore.stats.chainId.get() || '-';
  const isLoadingValue = blockchainStore.isLoading.get();
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
          <Text className="text-lg font-bold text-white">Blockchain Metrics</Text>
          {loading && <ActivityIndicator size="small" color="#E75A5C" />}
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