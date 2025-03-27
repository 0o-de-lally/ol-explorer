import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { useBlockchain } from '../src/hooks/useBlockchain';
import { useForceUpdate } from '../src/hooks/useForceUpdate';
import { blockchainActions } from '../src/store/blockchainStore';
import { useBlockTime } from '../src/hooks/useBlockTime';

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
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
      }
    >
      <HomeScreen />
    </ScrollView>
  );
} 