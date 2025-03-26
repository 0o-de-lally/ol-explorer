import React from 'react';
import { View, Text } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { blockchainStore } from '../store/blockchainStore';
import { blockTimeStore } from '../store/blockTimeStore';
import { formatTimestamp } from '../utils/formatters';

export const BlockchainMetrics: React.FC = () => {
  const blockTimeMs = useObservable(blockTimeStore.blockTimeMs);
  const lastBlockHeight = useObservable(blockTimeStore.lastBlockHeight);
  const lastBlockTimestamp = useObservable(blockTimeStore.lastBlockTimestamp);

  const formatBlockTime = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Get primitive values from observables and ensure they are numbers
  const blockTimeMsValue = Number(blockTimeMs.get() ?? 0);
  const lastBlockHeightValue = Number(lastBlockHeight.get() ?? 0);
  const lastBlockTimestampValue = Number(lastBlockTimestamp.get() ?? 0);

  return (
    <View className="flex-row justify-around p-4 bg-secondary rounded-lg mx-4 mb-4">
      <View className="items-center flex-1">
        <Text className="text-text-muted text-xs mb-1">Average Block Time</Text>
        <Text className="text-text-light text-base font-bold text-center">
          {!isNaN(blockTimeMsValue) ? formatBlockTime(blockTimeMsValue) : 'Calculating...'}
        </Text>
      </View>
      <View className="items-center flex-1">
        <Text className="text-text-muted text-xs mb-1">Latest Block</Text>
        <Text className="text-text-light text-base font-bold text-center">
          {!isNaN(lastBlockHeightValue) ? formatNumber(lastBlockHeightValue) : 'Loading...'}
        </Text>
      </View>
      <View className="items-center flex-1">
        <Text className="text-text-muted text-xs mb-1">Ledger Time</Text>
        <Text className="text-text-light text-base font-bold text-center">
          {!isNaN(lastBlockTimestampValue) ? formatTimestamp(lastBlockTimestampValue) : 'Loading...'}
        </Text>
      </View>
    </View>
  );
}; 