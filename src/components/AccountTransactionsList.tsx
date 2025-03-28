import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { observer } from '@legendapp/state/react';
import { formatTimestamp } from '../utils/formatters';
import { formatAddressForDisplay, normalizeTransactionHash } from '../utils/addressUtils';
import { useSdk } from '../hooks/useSdk';
import { router } from 'expo-router';

type AccountTransactionsListProps = {
  accountAddress: string;
  limit?: number;
  testID?: string;
  onRefresh?: () => void;
};

// Use observer pattern to correctly handle observables
export const AccountTransactionsList = observer(({
  accountAddress,
  limit = 25,
  testID,
  onRefresh
}: AccountTransactionsListProps) => {
  // State for transactions and loading
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const { width } = useWindowDimensions();
  const sdk = useSdk();

  // Check if we should use mobile layout
  const isMobile = width < 768;

  // Load transactions on component mount
  useEffect(() => {
    if (accountAddress) {
      fetchTransactions();
    }
  }, [accountAddress, limit]);

  // Function to fetch transactions
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Fetching transactions for account: ${accountAddress}`);
      const accountTxs = await sdk.ext_getAccountTransactions(accountAddress, limit);
      
      setTransactions(accountTxs);
      
      if (accountTxs.length === 0) {
        setError('No transactions found for this account');
      }
    } catch (e: any) {
      console.error('Error fetching account transactions:', e);
      setError(e.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    }
    await fetchTransactions();
  };

  const handleTransactionPress = (hash: string) => {
    // Normalize the hash using our utility function
    const normalizedHash = normalizeTransactionHash(hash);

    // Validate hash before navigation
    if (!normalizedHash) {
      console.error('Invalid transaction hash:', hash);
      return;
    }

    console.log('Navigating to transaction details with normalized hash:', normalizedHash);

    // Use Expo Router directly
    router.push(`/tx/${normalizedHash}`);
  };

  // Format the transaction hash for display
  const formatHash = (hash: string) => {
    if (hash.length <= 12) return hash;
    return formatAddressForDisplay(hash, 4, 4);
  };

  // Get display text for the hash
  const getSenderDisplay = (hash: string) => {
    return formatHash(hash);
  };

  const formatNumber = (num: number | string | undefined) => {
    if (num === undefined) return '0';
    return Number(num).toLocaleString();
  };

  // Determine function label based on transaction type
  const getFunctionLabel = (type: string, item: any) => {
    // First check if we have a payload with function field
    if (item.payload && item.payload.function) {
      // Extract the trailing part after the last :: 
      const functionPath = item.payload.function;
      const parts = functionPath.split('::');
      if (parts.length >= 3) {
        // Return the last part (e.g., "vouch_for" from "0x1::vouch::vouch_for")
        return parts[parts.length - 1];
      }
    }
    
    // For transactions from REST API, check transaction structure
    if (item.transaction?.payload?.function) {
      const functionPath = item.transaction.payload.function;
      const parts = functionPath.split('::');
      if (parts.length >= 3) {
        return parts[parts.length - 1];
      }
    }

    // Remove "_transaction" suffix if present
    if (type.endsWith('_transaction')) {
      return type.replace('_transaction', '');
    }

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

  // Get color for function pill based on function type
  const getFunctionPillColor = (type: string) => {
    // Map function types to pastel colors
    if (type.includes('state_checkpoint')) return 'bg-[#FFECEC] text-[#A73737]';
    if (type.includes('block_metadata')) return 'bg-[#E6F7FF] text-[#0072C6]';
    if (type === 'script') return 'bg-[#F3ECFF] text-[#6B46C1]';
    if (type === 'module') return 'bg-[#E6F7F5] text-[#047857]';
    if (type === 'entry_function') return 'bg-[#FFF7E6] text-[#B45309]';

    // Generate a consistent color based on the first character of the type
    const charCode = type.charCodeAt(0) % 5;
    const colorOptions = [
      'bg-[#E6F7FF] text-[#0072C6]', // blue
      'bg-[#F3ECFF] text-[#6B46C1]', // purple
      'bg-[#E6F7F5] text-[#047857]', // green
      'bg-[#FFF7E6] text-[#B45309]', // orange
      'bg-[#FFECEC] text-[#A73737]', // red
    ];

    return colorOptions[charCode];
  };

  const renderTableHeader = () => {
    if (isMobile) {
      // On mobile, don't show the header - we'll include labels in the row items
      return null;
    }

    return (
      <View className="flex-row py-2.5 px-4 bg-background border-b border-border">
        <Text className="font-bold text-text-muted text-sm flex-1 min-w-[120px] font-sans text-center">VERSION</Text>
        <Text className="font-bold text-text-muted text-sm flex-1 min-w-[160px] font-sans text-center">TX HASH</Text>
        <Text className="font-bold text-text-muted text-sm flex-1 min-w-[120px] font-sans text-center">FUNCTION</Text>
        <Text className="font-bold text-text-muted text-sm flex-1 min-w-[180px] font-sans text-center">TIME</Text>
      </View>
    );
  };

  const renderTransactionItem = (item: any) => {
    // Handle different data formats (REST API vs SDK)
    const hash = item.hash || item.transaction?.hash || '';
    const version = item.version || 0;
    const type = item.type || item.transaction?.type || '';
    const timestamp = item.timestamp || 
                      (item.transaction?.expiration_timestamp_secs ? item.transaction.expiration_timestamp_secs * 1000 : null) || 
                      Date.now();
    
    const functionLabel = getFunctionLabel(type, item);
    const functionPillColor = getFunctionPillColor(type);

    // Mobile view with stacked layout
    if (isMobile) {
      return (
        <TouchableOpacity
          key={hash}
          className="py-3 px-4 border-b border-border"
          onPress={() => handleTransactionPress(hash)}
          testID={`transaction-${hash}`}
        >
          <View className="flex-row justify-between items-center mb-2">
            <View className={`px-3 py-1 rounded-full w-[150px] flex items-center justify-center ${functionPillColor}`}>
              <Text className="text-xs font-medium">{functionLabel}</Text>
            </View>
            <Text className="text-white text-xs">{formatTimestamp(timestamp)}</Text>
          </View>

          <View className="flex-row mb-1">
            <Text className="text-text-muted text-xs mr-2">Tx Hash:</Text>
            <Text className="text-white text-xs font-data">{getSenderDisplay(hash)}</Text>
          </View>

          <View className="flex-row justify-between">
            <View className="flex-row">
              <Text className="text-text-muted text-xs mr-2">Version:</Text>
              <Text className="text-white text-xs font-data">{formatNumber(version)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Desktop view with row layout
    return (
      <TouchableOpacity
        key={hash}
        className="flex-row py-3 px-4 border-b border-border"
        onPress={() => handleTransactionPress(hash)}
        testID={`transaction-${hash}`}
      >
        <Text className="text-white text-sm flex-1 min-w-[120px] font-data text-center">{formatNumber(version)}</Text>
        <Text className="text-white text-sm flex-1 min-w-[160px] font-data text-center">{getSenderDisplay(hash)}</Text>
        <View className="flex-1 min-w-[120px] flex items-center justify-center">
          <View className={`px-3 py-1 rounded-full w-[150px] flex items-center justify-center ${functionPillColor}`}>
            <Text className="text-xs font-medium">{functionLabel}</Text>
          </View>
        </View>
        <Text className="text-white text-sm flex-1 min-w-[180px] text-center">{formatTimestamp(timestamp)}</Text>
      </TouchableOpacity>
    );
  };

  // Initial loading state with no transactions
  if (isLoading && transactions.length === 0) {
    return (
      <View className="mx-auto w-full max-w-screen-lg px-4 mb-5">
        <View className="bg-secondary rounded-lg" testID={testID}>
          <View className="h-1 bg-white/10" />
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <Text className="text-lg font-bold text-white">
              Account Transactions
              <ActivityIndicator size="small" color="#E75A5C" style={{ marginLeft: 8 }} />
            </Text>
          </View>

          <View className="justify-center items-center p-8">
            <ActivityIndicator size="large" color="#E75A5C" />
            <Text className="mt-4 text-base text-white">Loading transactions...</Text>
          </View>
        </View>
      </View>
    );
  }

  // Display error state if there was an error and no transactions
  if (error && transactions.length === 0) {
    return (
      <View className="mx-auto w-full max-w-screen-lg px-4 mb-5">
        <View className="bg-secondary rounded-lg" testID={testID}>
          <View className="h-1 bg-white/10" />
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <Text className="text-lg font-bold text-white">Account Transactions (0)</Text>
          </View>
          <View className="justify-center items-center p-8">
            <Text className="text-white text-base mb-4">{error}</Text>
            <TouchableOpacity
              className="bg-primary rounded-lg py-2 px-4"
              onPress={handleRefresh}
            >
              <Text className="text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Main render for populated list
  return (
    <View className="mx-auto w-full max-w-screen-lg px-4 mb-16">
      <View className="bg-secondary rounded-lg overflow-hidden" testID={testID}>
        <View className="h-1 bg-white/10" />
        <View className="flex-row justify-between items-center p-4 border-b border-border">
          <Text className="text-lg font-bold text-white">
            Account Transactions ({transactions.length})
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#E75A5C" />
          ) : (
            <TouchableOpacity onPress={handleRefresh} className="p-2">
              <Text className="text-primary">Refresh</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderTableHeader()}

        {transactions.length > 0 ? (
          <View className="w-full">
            {transactions.map(item => renderTransactionItem(item))}
          </View>
        ) : (
          <View className="justify-center items-center p-5">
            <Text className="text-white text-base">No transactions found</Text>
          </View>
        )}
      </View>
    </View>
  );
}); 