import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { blockchainStore } from '../store/blockchainStore';
import { blockTimeStore } from '../store/blockTimeStore';
import { Transaction } from '../types/blockchain';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getRelativeTimeString } from '../store/blockTimeStore';

type TransactionsListProps = {
  testID?: string;
  onRefresh?: () => void;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const TransactionsList: React.FC<TransactionsListProps> = ({ 
  testID,
  onRefresh 
}) => {
  const transactions = useObservable(blockchainStore.transactions);
  const isLoading = useObservable(blockchainStore.isLoading);
  const blockTimeMs = useObservable(blockTimeStore.blockTimeMs);
  const isCalculatingBlockTime = useObservable(blockTimeStore.isCalculating);
  const navigation = useNavigation<NavigationProp>();

  // Transform the observable data to regular array
  const transactionArray = useMemo(() => {
    return transactions.get().map(tx => ({
      hash: tx.hash.get(),
      version: tx.version.get(),
      sender: tx.sender.get(),
      sequence_number: tx.sequence_number.get(),
      timestamp: tx.timestamp.get(),
      type: tx.type.get(),
      status: tx.status.get(),
      gas_used: tx.gas_used?.get(),
      gas_unit_price: tx.gas_unit_price?.get(),
      vm_status: tx.vm_status?.get(),
      block_height: tx.block_height?.get() || tx.version.get() - 1000, // Use version - 1000 as fallback
      epoch: tx.epoch?.get(),
      round: tx.round?.get(),
      state_change_hash: tx.state_change_hash?.get(),
      event_root_hash: tx.event_root_hash?.get(),
      accumulator_root_hash: tx.accumulator_root_hash?.get()
    }));
  }, [transactions]);

  const handleTransactionPress = (hash: string) => {
    navigation.navigate('TransactionDetails', { hash });
  };

  // Format the transaction hash for display
  const formatHash = (hash: string) => {
    if (hash.length <= 12) return hash;
    return `${hash.substring(0, 4)}...${hash.substring(hash.length - 4)}`;
  };

  const formatNumber = (num: number | string | undefined) => {
    if (num === undefined) return '0';
    return Number(num).toLocaleString();
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
  
  // Determine function label based on transaction type
  const getFunctionLabel = (type: string) => {
    switch (type) {
      case 'module':
        return 'module';
      case 'script':
        return 'script';
      case 'entry_function':
        return 'entry_function';
      default:
        return type;
    }
  };

  const renderTableHeader = () => {
    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.blockHeightCol]}>BLOCK HEIGHT</Text>
        <Text style={[styles.headerCell, styles.versionCol]}>VERSION</Text>
        <Text style={[styles.headerCell, styles.fromCol]}>FROM</Text>
        <Text style={[styles.headerCell, styles.functionCol]}>FUNCTION</Text>
        <Text style={[styles.headerCell, styles.timeCol]}>TIME</Text>
      </View>
    );
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity 
      style={styles.tableRow}
      onPress={() => handleTransactionPress(item.hash)}
      testID={`transaction-${item.hash}`}
    >
      <Text style={[styles.cell, styles.blockHeightCol]}>{formatNumber(item.block_height)}</Text>
      <Text style={[styles.cell, styles.versionCol]}>{formatNumber(item.version)}</Text>
      <Text style={[styles.cell, styles.fromCol]}>{formatHash(item.sender)}</Text>
      <View style={styles.functionColWrapper}>
        <View style={[
          styles.functionBadge,
          item.type === 'script' ? styles.scriptBadge : 
          item.type === 'module' ? styles.moduleBadge : styles.defaultBadge
        ]}>
          <Text style={styles.functionBadgeText}>{getFunctionLabel(item.type)}</Text>
        </View>
      </View>
      <Text style={[styles.cell, styles.timeCol]}>{formatTimestamp(item.timestamp)}</Text>
    </TouchableOpacity>
  );

  if (isLoading.get() && transactionArray.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E75A5C" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Transactions ({transactionArray.length})</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {renderTableHeader()}
      
      <FlatList
        data={transactionArray}
        keyExtractor={(item) => item.hash}
        renderItem={renderTransactionItem}
        style={styles.tableBody}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#172234',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3a50',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#0D1626',
    borderBottomWidth: 1,
    borderBottomColor: '#2c3a50',
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3a50',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#ADBAC7',
    fontSize: 14,
  },
  cell: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  blockHeightCol: {
    flex: 1,
    minWidth: 100,
  },
  versionCol: {
    flex: 1,
    minWidth: 120,
  },
  fromCol: {
    flex: 1,
    minWidth: 160,
  },
  functionCol: {
    flex: 1,
    minWidth: 120,
  },
  functionColWrapper: {
    flex: 1,
    minWidth: 120,
  },
  timeCol: {
    flex: 1,
    minWidth: 180,
  },
  functionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  scriptBadge: {
    backgroundColor: '#F3ECFF',
  },
  moduleBadge: {
    backgroundColor: '#E6F7F5',
  },
  defaultBadge: {
    backgroundColor: '#F5F5F5',
  },
  functionBadgeText: {
    fontSize: 12,
    color: '#333',
  },
  listContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#172234',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  column: {
    flex: 1,
  },
  label: {
    color: '#8F9BB3',
    fontSize: 12,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  timestamp: {
    color: '#8F9BB3',
    fontSize: 12,
  },
}); 