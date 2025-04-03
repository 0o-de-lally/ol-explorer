import React from 'react';
import { ScrollView, RefreshControl, View } from 'react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { useBlockchain } from '../src/hooks/useBlockchain';
import { useForceUpdate } from '../src/hooks/useForceUpdate';
import { blockchainActions } from '../src/store/blockchainStore';
import { useBlockTime } from '../src/hooks/useBlockTime';
import { Redirect, Link } from 'expo-router';

export default function HomePage() {
  const { refreshData, isLoading } = useBlockchain();
  const updateCounter = useForceUpdate();

  // Use block time calculation hook
  useBlockTime();

  // Debug logging to track component updates
  React.useEffect(() => {
    console.log('HomePage updated, updateCounter:', updateCounter);
  }, [updateCounter]);

  // Force a fresh data load when the component mounts
  React.useEffect(() => {
    console.log('HomePage mounted, forcing refresh');
    blockchainActions.forceUpdate();
    refreshData();
  }, []);

  return (
    <View className="flex-1 bg-background">
      <HomeScreen />
    </View>
  );
} 