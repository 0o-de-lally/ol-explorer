import { View } from 'react-native';
import { Slot } from 'expo-router';
import { BlockchainMetrics } from '../src/components/BlockchainMetrics';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B1221' }}>
      <BlockchainMetrics />
      <Slot />
    </View>
  );
} 