import { View } from 'react-native';
import { Slot } from 'expo-router';
import { BlockchainMetrics } from '../src/components/BlockchainMetrics';

export default function RootLayout() {
  return (
    <View className="flex-1 bg-background">
      <BlockchainMetrics />
      <Slot />
    </View>
  );
} 