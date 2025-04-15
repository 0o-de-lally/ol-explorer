import React, { useEffect } from 'react';
import { View, Text, useWindowDimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { blockchainStore } from '../store/blockchainStore';
import { useForceUpdate } from '../hooks/useForceUpdate';
import { Ionicons } from '@expo/vector-icons';

type BlockchainStatsProps = {
  testID?: string;
};

export const BlockchainStats: React.FC<BlockchainStatsProps> = ({ testID }) => {
  // Use the useForceUpdate hook to ensure component updates
  const updateCounter = useForceUpdate();

  // Use the observable store to get reactive state
  const stats = useObservable(blockchainStore.stats);
  const isLoading = useObservable(blockchainStore.isLoading);
  const { width } = useWindowDimensions();

  // Debug logging to track component updates
  useEffect(() => {
    console.log('BlockchainStats updated', {
      updateCounter,
      blockHeight: stats.blockHeight.get(),
      epoch: stats.epoch.get(),
      chainId: stats.chainId.get(),
      isLoading: isLoading.get()
    });
  }, [updateCounter, stats.blockHeight.get(), stats.epoch.get(), stats.chainId.get(), isLoading.get()]);

  // Determine if we should stack vertically (for mobile screens)
  const isStackedLayout = width < 768;

  // Define the container style based on screen width
  const containerClassName = isStackedLayout
    ? "flex flex-col w-full gap-4 mb-5"
    : "flex-row justify-between w-full gap-5 mb-5";

  return (
    <View className="mx-auto w-full max-w-screen-lg px-4 mb-5" testID={testID}>
      <View className={containerClassName}>
        <View className="flex-1 bg-secondary rounded-lg overflow-hidden">
          <View className="h-1 bg-white/10" />
          <View className="p-5">
            <Text className="text-white text-base font-bold mb-2.5">Block Height</Text>
            {isLoading.get() && stats.blockHeight.get() === null ? (
              <ActivityIndicator size="small" color="#E75A5C" />
            ) : (
              <Text className="text-white text-2xl font-bold font-data">
                {stats.blockHeight.get()?.toLocaleString() || '0'}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-1 bg-secondary rounded-lg overflow-hidden">
          <View className="h-1 bg-white/10" />
          <View className="p-5">
            <Text className="text-white text-base font-bold mb-2.5">Current Epoch</Text>
            {isLoading.get() && stats.epoch.get() === null ? (
              <ActivityIndicator size="small" color="#E75A5C" />
            ) : (
              <Text className="text-white text-2xl font-bold font-data">
                {stats.epoch.get()?.toLocaleString() || '0'}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-1 bg-secondary rounded-lg overflow-hidden">
          <View className="h-1 bg-white/10" />
          <View className="p-5">
            <Text className="text-white text-base font-bold mb-2.5">Chain ID</Text>
            {isLoading.get() && stats.chainId.get() === null ? (
              <ActivityIndicator size="small" color="#E75A5C" />
            ) : (
              <Text className="text-white text-2xl font-bold font-data">
                {stats.chainId.get() || '0'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}; 