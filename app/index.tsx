import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { TransactionsList } from '../src/components/TransactionsList';
import { useBlockchain } from '../src/hooks/useBlockchain';
import { useForceUpdate } from '../src/hooks/useForceUpdate';
import { blockchainActions } from '../src/store/blockchainStore';

export default function HomePage() {
  const { refreshData, isLoading } = useBlockchain();
  const updateCounter = useForceUpdate();

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
      <TransactionsList testID="transactions-list" onRefresh={refreshData} />
    </ScrollView>
  );
} 