import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { observer } from '@legendapp/state/react';
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

// Use the observer HOC to automatically handle observables
export const BlockchainMetrics = observer(() => {
  // Force component to update on SDK changes
  const updateCounter = useForceUpdate();
  const { isInitialized } = useSdkContext();

  // Access primitive values from observables
  const blockTimeMsValue = Number(blockTimeStore.blockTimeMs.get() ?? 0);
  const lastBlockHeightValue = Number(blockTimeStore.lastBlockHeight.get() ?? 0);
  const lastBlockTimestampValue = Number(blockTimeStore.lastBlockTimestamp.get() ?? 0);
  const blockHeightValue = Number(blockchainStore.stats.blockHeight.get() ?? 0);
  const epochValue = Number(blockchainStore.stats.epoch.get() ?? 0);
  const chainIdValue = blockchainStore.stats.chainId.get() || '-';
  const isLoadingValue = blockchainStore.isLoading.get();
  const loading = isLoadingValue || !isInitialized;

  // Get latest transaction version from transactions if available
  const transactions = blockchainStore.transactions.get();
  const latestVersion = transactions && transactions.length > 0 ?
    Number(transactions[0].version) : null;

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
            <Text className="text-text-muted text-xs mb-1">Block Height</Text>
            <Text className="text-text-light text-base font-bold text-center" testID="block-height-value">
              {formatNumber(blockHeightValue)}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Epoch</Text>
            <Text className="text-text-light text-base font-bold text-center">
              {formatNumber(epochValue)}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Chain ID</Text>
            <Text className="text-text-light text-base font-bold text-center">
              {chainIdValue}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Average Block Time</Text>
            <Text className="text-text-light text-base font-bold text-center">
              {!isNaN(blockTimeMsValue) && blockTimeMsValue > 0 ? formatBlockTime(blockTimeMsValue) : 'Calculating...'}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Latest Version</Text>
            <Text className="text-text-light text-base font-bold text-center" data-testid="latest-version">
              {formatNumber(latestVersion)}
            </Text>
          </View>

          <View className="items-center p-2 min-w-[120px]">
            <Text className="text-text-muted text-xs mb-1">Ledger Time</Text>
            <Text className="text-text-light text-base font-bold text-center">
              {!isNaN(lastBlockTimestampValue) && lastBlockTimestampValue > 0 ? formatTimestamp(lastBlockTimestampValue) : 'Loading...'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}); 