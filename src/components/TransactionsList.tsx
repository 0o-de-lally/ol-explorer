import React, { useMemo } from 'react';
import {
  View,
  Text,
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
import { formatTimestamp } from '../utils/formatters';

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
      <View className="flex-row py-2.5 px-4 bg-background border-b border-border">
        <Text className="font-bold text-text-muted text-sm flex-1 min-w-[100px]">BLOCK HEIGHT</Text>
        <Text className="font-bold text-text-muted text-sm flex-1 min-w-[120px]">VERSION</Text>
        <Text className="font-bold text-text-muted text-sm flex-1 min-w-[160px]">FROM</Text>
        <Text className="font-bold text-text-muted text-sm flex-1 min-w-[120px]">FUNCTION</Text>
        <Text className="font-bold text-text-muted text-sm flex-1 min-w-[180px]">TIME</Text>
      </View>
    );
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      className="flex-row py-3 px-4 border-b border-border"
      onPress={() => handleTransactionPress(item.hash)}
      testID={`transaction-${item.hash}`}
    >
      <Text className="text-white text-sm flex-1 min-w-[100px]">{formatNumber(item.block_height)}</Text>
      <Text className="text-white text-sm flex-1 min-w-[120px]">{formatNumber(item.version)}</Text>
      <Text className="text-white text-sm flex-1 min-w-[160px]">{formatHash(item.sender)}</Text>
      <View className="flex-1 min-w-[120px]">
        <View className={`px-2 py-0.5 rounded self-start ${item.type === 'script' ? 'bg-[#F3ECFF]' :
          item.type === 'module' ? 'bg-[#E6F7F5]' : 'bg-[#F5F5F5]'
          }`}>
          <Text className="text-xs text-[#333]">{getFunctionLabel(item.type)}</Text>
        </View>
      </View>
      <Text className="text-white text-sm flex-1 min-w-[180px]">{formatTimestamp(item.timestamp)}</Text>
    </TouchableOpacity>
  );

  if (isLoading.get() && transactionArray.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-8 bg-secondary rounded-lg">
        <ActivityIndicator size="large" color="#E75A5C" />
        <Text className="mt-4 text-base text-white">Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-secondary rounded-lg overflow-hidden" testID={testID}>
      <View className="flex-row justify-between items-center p-4 border-b border-border">
        <Text className="text-lg font-bold text-white">Recent Transactions ({transactionArray.length})</Text>
        <TouchableOpacity className="p-2" onPress={onRefresh}>
          <Text className="text-white font-bold">↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {renderTableHeader()}

      <FlatList
        data={transactionArray}
        keyExtractor={(item) => item.hash}
        renderItem={renderTransactionItem}
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      />
    </View>
  );
}; 