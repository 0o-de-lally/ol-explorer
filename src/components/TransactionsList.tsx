import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus
} from 'react-native';
import { observer } from '@legendapp/state/react';
import { blockchainStore, blockchainActions } from '../store/blockchainStore';
import { formatTimestamp } from '../utils/formatters';
import { formatAddressForDisplay, normalizeTransactionHash } from '../utils/addressUtils';
import { useSdkContext } from '../context/SdkContext';
import { useForceUpdateTransactions } from '../hooks/useForceUpdate';
import { router } from 'expo-router';
import { useSdk } from '../hooks/useSdk';
import appConfig from '../config/appConfig';

type TransactionsListProps = {
  testID?: string;
  onRefresh?: () => void;
  initialLimit?: number;
  onLimitChange?: (newLimit: number) => void;
  isVisible?: boolean;
};

// Use observer pattern to correctly handle observables
export const TransactionsList = observer(({
  testID,
  onRefresh,
  initialLimit = 25,
  onLimitChange,
  isVisible = true
}: TransactionsListProps) => {
  // State for refresh indicator
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Use the store's currentLimit instead of local state
  const currentLimit = blockchainStore.currentLimit.get();

  // Effect to notify parent component when limit changes - now uses a ref to track previous value
  // to avoid unnecessary notifications
  const previousLimitRef = useRef(currentLimit);
  useEffect(() => {
    // Only notify if the limit actually changed AND we have an onLimitChange handler
    if (onLimitChange && currentLimit !== previousLimitRef.current) {
      console.log(`Notifying parent of limit change: ${previousLimitRef.current} -> ${currentLimit}`);
      onLimitChange(currentLimit);
      previousLimitRef.current = currentLimit;
    }
  }, [currentLimit, onLimitChange]);

  // Add refs to track polling interval and app state
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);

  const { isInitialized } = useSdkContext();
  const sdk = useSdk();

  // Set isMounted ref on mount/unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      console.log('App has come to the foreground, refreshing transactions');
      if (isVisible && isInitialized) {
        handleAutoRefresh();
      }
    }
    appState.current = nextAppState;
  };

  // Auto-refresh polling
  const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

  // Set up and clean up polling based on visibility
  useEffect(() => {
    // Create or destroy polling interval based on visibility
    if (isVisible) {
      // Reset any lingering auto-refresh state
      setIsAutoRefreshing(false);
      startPolling();
    } else {
      stopPolling();
    }

    // Clean up polling on unmount
    return () => {
      stopPolling();
    };
  }, [isVisible, isInitialized]);

  // Start polling interval
  const startPolling = () => {
    // Only start polling if not already polling and component is visible
    if (!pollingIntervalRef.current && isVisible && isInitialized) {
      console.log('Starting polling for transactions list');

      // Reset any lingering auto-refresh state
      setIsAutoRefreshing(false);

      pollingIntervalRef.current = setInterval(() => {
        // Only poll if we're not already loading and component is still visible and mounted
        if (!isRefreshing && !isLoadingMore && !isAutoRefreshing && isVisible && isMounted.current) {
          console.log('Auto-refreshing transactions list');
          handleAutoRefresh();
        }
      }, AUTO_REFRESH_INTERVAL);
    }
  };

  // Stop polling interval
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('Stopping polling for transactions list');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Handle auto-refresh
  const handleAutoRefresh = async () => {
    // Always allow manual refresh, even if auto-refresh is running
    try {
      setIsAutoRefreshing(true);

      // Get the latest currentLimit from the store
      const currentStoreLimit = blockchainStore.currentLimit.get();

      // Fetch transactions directly with current limit from store
      const transactions = await sdk.getTransactions(currentStoreLimit);

      // Update the store directly with these transactions using transaction-specific actions
      if (isMounted.current) {
        blockchainActions.setTransactions(transactions);
      }

      console.log(`Auto-refreshed ${transactions.length} transactions with limit ${currentStoreLimit}`);
    } catch (error) {
      console.error('Error during auto-refresh:', error);
    } finally {
      if (isMounted.current) {
        setTimeout(() => {
          setIsAutoRefreshing(false);
        }, 500); // Short delay to ensure the user sees the refresh indicator
      }
    }
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    // Always handle manual refresh requests
    setIsRefreshing(true);

    try {
      if (onRefresh) {
        onRefresh();
      }

      // Don't reset to initial limit - keep the user's current view preference
      // First, try to fetch using the SDK directly with the current limit
      const currentStoreLimit = blockchainStore.currentLimit.get();
      console.log(`Refreshing transactions with current limit: ${currentStoreLimit}`);

      // Use forceUpdateTransactions to force only transaction updates, not metrics
      blockchainActions.forceUpdateTransactions();

      // Fetch transactions directly with current limit
      const transactions = await sdk.getTransactions(currentStoreLimit);

      // Update the store directly with these transactions
      blockchainActions.setTransactions(transactions);

      console.log(`Refreshed ${transactions.length} transactions with limit ${currentStoreLimit}`);
    } catch (error) {
      console.error('Error during direct refresh:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 800); // Ensure animation completes
    }
  };

  // Handle load more button click
  const handleLoadMore = async () => {
    // Always allow loading more when button is clicked
    try {
      // Set loading state immediately
      setIsLoadingMore(true);

      // Calculate the new limit with exact 25 increment
      const newLimit = Math.min(currentLimit + 25, 100);
      console.log(`Loading more transactions, new limit: ${newLimit}`);

      // Update the currentLimit in the store - this only affects transactions
      blockchainActions.setCurrentLimit(newLimit);

      // Immediately fetch transactions with the new limit - pass newLimit directly to avoid race condition
      const transactions = await sdk.getTransactions(newLimit);  // Use newLimit directly, not currentLimit
      console.log(`Fetched ${transactions.length} transactions with new limit ${newLimit}`);

      // Update the store with the new transactions if the component is still mounted
      if (isMounted.current) {
        // Use transaction-specific actions
        blockchainActions.setTransactions(transactions);
        console.log(`Successfully loaded ${transactions.length} transactions with limit ${newLimit}`);
      }
    } catch (error) {
      console.error('Error loading more transactions:', error);
    } finally {
      // Always reset loading state when finished
      if (isMounted.current) {
        setIsLoadingMore(false);
      }
    }
  };

  // Get values from observables
  const transactions = blockchainStore.transactions.get();
  const isLoading = blockchainStore.isLoading.get();
  const lastTransactionsUpdated = blockchainStore.lastTransactionsUpdated.get();

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
    return (
      <View className="hidden md:flex md:flex-row py-2.5 px-4 bg-background border-b border-border w-full">
        <Text className="font-bold text-text-muted text-sm w-1/5 font-sans text-center truncate">VERSION</Text>
        <Text className="font-bold text-text-muted text-sm w-1/5 font-sans text-center truncate">TX HASH</Text>
        <Text className="font-bold text-text-muted text-sm w-2/5 font-sans text-center truncate">FUNCTION</Text>
        <Text className="font-bold text-text-muted text-sm w-1/5 font-sans text-center truncate">TIME</Text>
      </View>
    );
  };

  const renderTransactionItem = (item: any) => {
    const functionLabel = getFunctionLabel(item.type, item);
    const functionPillColor = getFunctionPillColor(item.type, functionLabel);

    return (
      <TouchableOpacity
        key={item.hash}
        className="w-full border-b border-border"
        onPress={() => handleTransactionPress(item.hash)}
        testID={`transaction-${item.hash}`}
      >
        {/* Mobile View (Stacked Layout) */}
        <View className="md:hidden py-3 px-4 w-full">
          <View className="w-full space-y-2">
            {/* First row */}
            <View className="w-full flex-none flex-row items-center justify-between">
              <View className={`rounded-full ${functionPillColor}`}>
                <Text className="text-xs font-medium px-3 py-1">{functionLabel}</Text>
              </View>
              <Text className="text-white text-xs font-data">{formatNumber(item.version)}</Text>
            </View>

            {/* Second row */}
            <View className="w-full flex-none flex-row items-center justify-between">
              <Text className="text-white text-xs font-data">{getSenderDisplay(item.hash)}</Text>
              <Text className="text-white text-xs">{formatTimestamp(item.timestamp)}</Text>
            </View>
          </View>
        </View>

        {/* Desktop View (Row Layout) */}
        <View className="hidden md:flex flex-row py-3 px-4 w-full">
          <Text className="text-white text-sm w-1/5 font-data text-center">{formatNumber(item.version)}</Text>
          <Text className="text-white text-sm w-1/5 font-data text-center">{getSenderDisplay(item.hash)}</Text>
          <View className="w-2/5 flex items-center justify-center">
            <View className={`px-3 py-1 rounded-full max-w-[180px] w-auto flex items-center justify-center ${functionPillColor}`}>
              <Text className="text-xs font-medium">{functionLabel}</Text>
            </View>
          </View>
          <Text className="text-white text-sm w-1/5 text-center">{formatTimestamp(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Initial loading state with no transactions
  if (isLoading && transactions.length === 0) {
    return (
      <View className="w-full mb-5">
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
      <View className="w-full mb-5">
        <View className="bg-secondary rounded-lg" testID={testID}>
          <View className="h-1 bg-white/10" />
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <Text className="text-lg font-bold text-white">Recent Transactions (0)</Text>
            {(isRefreshing || isAutoRefreshing) ? (
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
    <View className="w-full mb-8">
      <View className="bg-secondary rounded-lg overflow-hidden" testID={testID}>
        <View className="h-1 bg-white/10" />
        <View className="flex-row justify-between items-center p-4 border-b border-border">
          <Text className="text-lg font-bold text-white">
            Recent Transactions ({transactions.length})
          </Text>
          <View className="w-8 h-8 justify-center items-center">
            {(isRefreshing || isAutoRefreshing || isLoading) ? (
              <ActivityIndicator size="small" color="#E75A5C" />
            ) : (
              <TouchableOpacity onPress={handleRefresh} className="p-2">
                <Text className="text-primary">Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {renderTableHeader()}

        {transactions.length > 0 ? (
          <View className="w-full">
            {sortedTransactions.map(item => renderTransactionItem(item))}

            {/* Load More Button */}
            <View className="items-center justify-center py-4">
              {isLoadingMore ? (
                <ActivityIndicator size="small" color="#E75A5C" />
              ) : currentLimit >= 100 ? (
                <Text className="text-text-muted text-sm py-2">
                  Maximum of 100 transactions reached
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleLoadMore}
                  className="bg-secondary border border-primary rounded-lg py-2 px-4"
                >
                  <Text className="text-primary">Load More Transactions ({currentLimit} → {Math.min(currentLimit + 25, 100)})</Text>
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