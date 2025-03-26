import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { TransactionsList } from '../../src/components/TransactionsList';
import { BlockchainMetrics } from '../../src/components/BlockchainMetrics';
import { useBlockchain } from '../../src/hooks/useBlockchain';

export default function HomePage() {
  const { refreshData, isLoading } = useBlockchain();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
      }
    >
      <BlockchainMetrics />
      <TransactionsList testID="transactions-list" onRefresh={refreshData} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1221',
  },
}); 