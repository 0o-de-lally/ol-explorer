import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { observer } from '@legendapp/state/react';
import { blockchainStore, blockchainActions } from '../store/blockchainStore';
import { formatTimestamp } from '../utils/formatters';
import { formatAddressForDisplay, normalizeTransactionHash } from '../utils/addressUtils';
import { useSdkContext } from '../context/SdkContext';
import { useForceUpdate } from '../hooks/useForceUpdate';
import { router } from 'expo-router';
import { useSdk } from '../hooks/useSdk';
import appConfig from '../config/appConfig';

type TransactionsListProps = {
  testID?: string;
  onRefresh?: () => void;
  initialLimit?: number;
  onLimitChange?: (newLimit: number) => void;
};

// Use observer pattern to correctly handle observables
export const TransactionsList = observer(({
  testID,
  onRefresh,
  initialLimit = appConfig.transactions.defaultLimit,
  onLimitChange
}: TransactionsListProps) => {
  // State for refresh indicator
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(initialLimit);
  
  // Effect to notify parent component when limit changes
  useEffect(() => {
    if (onLimitChange && currentLimit !== initialLimit) {
      onLimitChange(currentLimit);
    }
  }, [currentLimit, initialLimit, onLimitChange]);
  
  const { isInitialized } = useSdkContext();
  const { width } = useWindowDimensions();
  const updateCounter = useForceUpdate();
  const sdk = useSdk();

  // Handle refresh button click
  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        // Don't reset to initial limit - keep the user's current view preference
        // First, try to fetch using the SDK directly with the current limit
        console.log(`Refreshing transactions with current limit: ${currentLimit}`);
        
        // Fetch transactions directly with current limit
        const transactions = await sdk.getTransactions(currentLimit);
        
        // Update the store directly with these transactions
        blockchainActions.setTransactions(transactions);
        
        console.log(`Refreshed ${transactions.length} transactions with limit ${currentLimit}`);
      } catch (error) {
        console.error('Error during direct refresh:', error);
        // Fall back to the parent's refresh method
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
        }, 800); // Ensure animation completes
      }
    }
  };
  
  // Handle load more button click
  const handleLoadMore = async () => {
    if (!isLoadingMore && isInitialized) {
      try {
        setIsLoadingMore(true);
        
        // Calculate the new limit
        const newLimit = Math.min(currentLimit + appConfig.transactions.incrementSize, appConfig.transactions.maxLimit);
        
        // Update the current limit state - this will trigger the useEffect to notify parent
        setCurrentLimit(newLimit);
        
        console.log(`Loading more transactions, new limit: ${newLimit}`);
        
        // Fetch transactions with the new limit
        const transactions = await sdk.getTransactions(newLimit);
        
        // Update the store with the new transactions
        blockchainActions.setTransactions(transactions);
        
        console.log(`Loaded ${transactions.length} transactions`);
      } catch (error) {
        console.error('Error loading more transactions:', error);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  // Check if we should use mobile layout
  const isMobile = width < 768;

  // Get values from observables
  const transactions = blockchainStore.transactions.get();
  const isLoading = blockchainStore.isLoading.get();

  // Sort transactions by version (descending) and then by timestamp (most recent first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    // First sort by version (block number) in descending order
    if (Number(b.version) !== Number(a.version)) {
      return Number(b.version) - Number(a.version);
    }
    // If versions are equal, sort by timestamp in descending order
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

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

  // Get color for function pill based on function type - using alphabetical index
  const getFunctionPillColor = (type: string, functionName: string) => {
    // First check for special mappings from config
    const normalizedType = type.toLowerCase();
    
    // Check for special cases from config
    for (const [specialType, colors] of Object.entries(appConfig.ui.specialFunctionPills)) {
      if (normalizedType.includes(specialType)) {
        return `${colors.bg} ${colors.text}`;
      }
    }
    
    // Use the functionName (which is from getFunctionLabel) for consistent alphabetical indexing
    const normalizedName = functionName.toLowerCase();
    
    // Get alphabetical position and map to color
    const firstChar = normalizedName.charAt(0);
    const charCode = firstChar.charCodeAt(0) - 'a'.charCodeAt(0);
    
    // Ensure positive index (in case of non-alphabetic characters)
    const index = Math.max(0, charCode) % appConfig.ui.functionPillColors.length;
    const colors = appConfig.ui.functionPillColors[index];
    
    return `${colors.bg} ${colors.text}`;
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
    const functionLabel = getFunctionLabel(item.type, item);
    const functionPillColor = getFunctionPillColor(item.type, functionLabel);

    // Mobile view with stacked layout
    if (isMobile) {
      return (
        <TouchableOpacity
          key={item.hash}
          className="py-3 px-4 border-b border-border"
          onPress={() => handleTransactionPress(item.hash)}
          testID={`transaction-${item.hash}`}
        >
          <View className="flex-row justify-between items-center mb-2">
            <View className={`px-3 py-1 rounded-full w-[150px] flex items-center justify-center ${functionPillColor}`}>
              <Text className="text-xs font-medium">{functionLabel}</Text>
            </View>
            <Text className="text-white text-xs">{formatTimestamp(item.timestamp)}</Text>
          </View>

          <View className="flex-row mb-1">
            <Text className="text-text-muted text-xs mr-2">Tx Hash:</Text>
            <Text className="text-white text-xs font-data">{getSenderDisplay(item.hash)}</Text>
          </View>

          <View className="flex-row justify-between">
            <View className="flex-row">
              <Text className="text-text-muted text-xs mr-2">Version:</Text>
              <Text className="text-white text-xs font-data">{formatNumber(item.version)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Desktop view with row layout
    return (
      <TouchableOpacity
        key={item.hash}
        className="flex-row py-3 px-4 border-b border-border"
        onPress={() => handleTransactionPress(item.hash)}
        testID={`transaction-${item.hash}`}
      >
        <Text className="text-white text-sm flex-1 min-w-[120px] font-data text-center">{formatNumber(item.version)}</Text>
        <Text className="text-white text-sm flex-1 min-w-[160px] font-data text-center">{getSenderDisplay(item.hash)}</Text>
        <View className="flex-1 min-w-[120px] flex items-center justify-center">
          <View className={`px-3 py-1 rounded-full w-[150px] flex items-center justify-center ${functionPillColor}`}>
            <Text className="text-xs font-medium">{functionLabel}</Text>
          </View>
        </View>
        <Text className="text-white text-sm flex-1 min-w-[180px] text-center">{formatTimestamp(item.timestamp)}</Text>
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
              Recent Transactions
              <ActivityIndicator size="small" color="#E75A5C" style={{ marginLeft: 8 }} />
            </Text>
            {/* No refresh button during loading */}
          </View>

          <View className="justify-center items-center p-8">
            <ActivityIndicator size="large" color="#E75A5C" />
            <Text className="mt-4 text-base text-white">Loading transactions...</Text>
          </View>
        </View>
      </View>
    );
  }

  // Fixed condition for empty state when not loading
  if (transactions.length === 0 && !isLoading) {
    return (
      <View className="mx-auto w-full max-w-screen-lg px-4 mb-5">
        <View className="bg-secondary rounded-lg" testID={testID}>
          <View className="h-1 bg-white/10" />
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <Text className="text-lg font-bold text-white">Recent Transactions (0)</Text>
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#E75A5C" />
            ) : (
              <TouchableOpacity onPress={handleRefresh} className="p-2">
                <Text className="text-primary">Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="justify-center items-center p-8">
            <Text className="text-white text-base mb-4">No transactions found</Text>
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
            Recent Transactions ({transactions.length})
          </Text>
          {isRefreshing ? (
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
            {sortedTransactions.map(item => renderTransactionItem(item))}
            
            {/* Load More Button */}
            <View className="items-center justify-center py-4">
              {isLoadingMore ? (
                <ActivityIndicator size="small" color="#E75A5C" />
              ) : currentLimit >= appConfig.transactions.maxLimit ? (
                <Text className="text-text-muted text-sm py-2">
                  Maximum of {appConfig.transactions.maxLimit} transactions reached (API limit)
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleLoadMore}
                  className="bg-secondary border border-primary rounded-lg py-2 px-4"
                >
                  <Text className="text-primary">Load More Transactions ({transactions.length} shown)</Text>
                </TouchableOpacity>
              )}
            </View>
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