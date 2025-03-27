import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { blockchainStore } from '../store/blockchainStore';

type BlockchainStatsProps = {
  testID?: string;
};

export const BlockchainStats: React.FC<BlockchainStatsProps> = ({ testID }) => {
  const stats = useObservable(blockchainStore.stats);
  const { width } = useWindowDimensions();

  // Determine if we should stack vertically (for mobile screens)
  const isStackedLayout = width < 768;

  // Format the block height with commas
  const formattedBlockHeight = stats.blockHeight.get()?.toLocaleString() || 'Loading...';

  // Define the container style based on screen width
  const containerClassName = isStackedLayout
    ? "flex flex-col w-full gap-4 mb-5"
    : "flex-row justify-between w-full gap-5 mb-5";

  return (
    <View className={containerClassName} testID={testID}>
      <View className="flex-1 bg-secondary rounded-lg p-5">
        <Text className="text-white text-base font-bold mb-2.5">Block Height</Text>
        <Text className="text-white text-2xl font-bold">{formattedBlockHeight}</Text>
      </View>

      <View className="flex-1 bg-secondary rounded-lg p-5">
        <Text className="text-white text-base font-bold mb-2.5">Current Epoch</Text>
        <Text className="text-white text-2xl font-bold">{stats.epoch.get() || 'Loading...'}</Text>
      </View>

      <View className="flex-1 bg-secondary rounded-lg p-5">
        <Text className="text-white text-base font-bold mb-2.5">Chain ID</Text>
        <Text className="text-white text-2xl font-bold">{stats.chainId.get() || 'Loading...'}</Text>
      </View>
    </View>
  );
}; 