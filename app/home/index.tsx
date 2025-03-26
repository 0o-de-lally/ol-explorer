import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { TransactionsList } from '../../src/components/TransactionsList';
import { BlockchainMetrics } from '../../src/components/BlockchainMetrics';
import { useBlockchain } from '../../src/hooks/useBlockchain';

export default function HomePage() {
  const { refreshData, isLoading } = useBlockchain();

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
      }
    >
      <BlockchainMetrics />
      <TransactionsList testID="transactions-list" onRefresh={refreshData} />
    </ScrollView>
  );
} 