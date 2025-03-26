import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
    <View style={styles.containerWrapper} testID={testID}>
      <View style={styles.container}>
        <View style={styles.statBox}>
          <Text style={styles.label}>Block Height</Text>
          <Text style={styles.value}>{formattedBlockHeight}</Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.label}>Current Epoch</Text>
          <Text style={styles.value}>{stats.epoch.get() || 'Loading...'}</Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.label}>Chain ID</Text>
          <Text style={styles.value}>{stats.chainId.get() || 'Loading...'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#172234',
    borderRadius: 8,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
}); 