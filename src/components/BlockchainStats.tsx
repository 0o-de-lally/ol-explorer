import React from 'react';
import { View, Text } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { blockchainStore } from '../store/blockchainStore';

type BlockchainStatsProps = {
  testID?: string;
};

export const BlockchainStats: React.FC<BlockchainStatsProps> = ({ testID }) => {
  const stats = useObservable(blockchainStore.stats);

  // Format the block height with commas
  const formattedBlockHeight = stats.blockHeight.get()?.toLocaleString() || 'Loading...';

  return (
    <View className="flex-row justify-between w-full mb-5" testID={testID}>
      <View className="flex-row justify-between w-full gap-5">
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
    </View>
  );
}; 