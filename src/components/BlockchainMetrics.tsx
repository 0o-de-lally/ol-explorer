import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { blockchainStore } from '../store/blockchainStore';
import { blockTimeStore } from '../store/blockTimeStore';

export const BlockchainMetrics: React.FC = () => {
  const blockTimeMs = useObservable(blockTimeStore.blockTimeMs);
  const lastBlockHeight = useObservable(blockTimeStore.lastBlockHeight);
  const lastBlockTimestamp = useObservable(blockTimeStore.lastBlockTimestamp);

  const formatBlockTime = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatTimestamp = (timestamp: number) => {
    // Convert microseconds to milliseconds for UTC date
    const date = new Date(Math.floor(timestamp / 1000));
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  // Get primitive values from observables and ensure they are numbers
  const blockTimeMsValue = Number(blockTimeMs.get() ?? 0);
  const lastBlockHeightValue = Number(lastBlockHeight.get() ?? 0);
  const lastBlockTimestampValue = Number(lastBlockTimestamp.get() ?? 0);

  return (
    <View style={styles.container}>
      <View style={styles.metric}>
        <Text style={styles.label}>Average Block Time</Text>
        <Text style={styles.value}>
          {!isNaN(blockTimeMsValue) ? formatBlockTime(blockTimeMsValue) : 'Calculating...'}
        </Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.label}>Latest Block</Text>
        <Text style={styles.value}>
          {!isNaN(lastBlockHeightValue) ? formatNumber(lastBlockHeightValue) : 'Loading...'}
        </Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.label}>Ledger Time</Text>
        <Text style={styles.value}>
          {!isNaN(lastBlockTimestampValue) ? formatTimestamp(lastBlockTimestampValue) : 'Loading...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#1A2235',
    borderRadius: 8,
    marginBottom: 16,
    margin: 16,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: '#8F9BB3',
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 