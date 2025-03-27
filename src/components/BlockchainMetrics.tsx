import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { blockchainStore } from '../store/blockchainStore';
import { blockTimeStore } from '../store/blockTimeStore';
import { formatTimestamp } from '../utils/formatters';
import { useSdkContext } from '../context/SdkContext';
import { useForceUpdate } from '../hooks/useForceUpdate';

export const BlockchainMetrics: React.FC = () => {
  // Force component to update on SDK changes
  const updateCounter = useForceUpdate();

  // Block time metrics from blockTimeStore
  const blockTimeMs = useObservable(blockTimeStore.blockTimeMs);
  const lastBlockHeight = useObservable(blockTimeStore.lastBlockHeight);
  const lastBlockTimestamp = useObservable(blockTimeStore.lastBlockTimestamp);

  // Blockchain stats from blockchainStore
  const stats = useObservable(blockchainStore.stats);
  const isLoading = useObservable(blockchainStore.isLoading);
  const { isInitialized } = useSdkContext();

  // Debug logging to track component updates
  useEffect(() => {
    console.log('BlockchainMetrics updated', {
      updateCounter,
      blockHeight: stats.blockHeight.get(),
      epoch: stats.epoch.get(),
      chainId: stats.chainId.get(),
      blockTimeMs: blockTimeMs.get(),
      lastBlockHeight: lastBlockHeight.get(),
      lastBlockTimestamp: lastBlockTimestamp.get(),
      isLoading: isLoading.get(),
      isInitialized
    });
  }, [
    updateCounter,
    stats.blockHeight.get(),
    stats.epoch.get(),
    stats.chainId.get(),
    blockTimeMs.get(),
    lastBlockHeight.get(),
    lastBlockTimestamp.get(),
    isLoading.get(),
    isInitialized
  ]);

  const formatBlockTime = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(Number(num))) return '-';
    return Number(num).toLocaleString();
  };

  // Get primitive values from observables and ensure they are numbers
  const blockTimeMsValue = Number(blockTimeMs.get() ?? 0);
  const lastBlockHeightValue = Number(lastBlockHeight.get() ?? 0);
  const lastBlockTimestampValue = Number(lastBlockTimestamp.get() ?? 0);

  // Get blockchain stats values
  const blockHeightValue = stats.blockHeight.get();
  const epochValue = stats.epoch.get();
  const chainIdValue = stats.chainId.get();

  // Determine if we're still loading data
  const loading = isLoading.get() || !isInitialized;

  return (
    <View className="p-4 bg-secondary rounded-lg mx-4 mb-4 overflow-hidden">
      <View className="h-1 bg-white/10" />
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-white">Blockchain Metrics</Text>
        {loading && <ActivityIndicator size="small" color="#E75A5C" />}
      </View>

      <View className="flex-row justify-around flex-wrap">
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
            {chainIdValue || '-'}
          </Text>
        </View>

        <View className="items-center p-2 min-w-[120px]">
          <Text className="text-text-muted text-xs mb-1">Average Block Time</Text>
          <Text className="text-text-light text-base font-bold text-center">
            {!isNaN(blockTimeMsValue) && blockTimeMsValue > 0 ? formatBlockTime(blockTimeMsValue) : 'Calculating...'}
          </Text>
        </View>

        <View className="items-center p-2 min-w-[120px]">
          <Text className="text-text-muted text-xs mb-1">Latest Block</Text>
          <Text className="text-text-light text-base font-bold text-center" data-testid="block-height">
            {!isNaN(lastBlockHeightValue) && lastBlockHeightValue > 0 ? formatNumber(lastBlockHeightValue) : 'Loading...'}
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
  );
}; 