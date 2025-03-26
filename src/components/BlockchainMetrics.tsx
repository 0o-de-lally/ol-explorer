import React from 'react';
import { View, Text } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { blockchainStore } from '../store/blockchainStore';
import { blockTimeStore } from '../store/blockTimeStore';

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

  const formatTimestamp = (timestamp: number) => {
    // Debug timestamp value
    console.log(`BlockchainMetrics formatTimestamp input:`, timestamp);

    // Handle different timestamp formats:
    // - If timestamp is in microseconds (very large number > 1 trillion), convert to milliseconds
    let timeInMs = timestamp;
    if (timestamp > 1000000000000) {
      timeInMs = Math.floor(timestamp / 1000); // Convert microseconds to milliseconds
      console.log(`Converting large timestamp from microseconds to milliseconds:`, timeInMs);
    }

    // Create date object from milliseconds
    const date = new Date(timeInMs);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date from timestamp: ${timestamp}`);
      return 'Invalid Date';
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
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