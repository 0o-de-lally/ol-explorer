import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  useWindowDimensions
} from 'react-native';
import { observer } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { formatTimestamp } from '../utils/formatters';
import { formatAddressForDisplay, normalizeTransactionHash } from '../utils/addressUtils';
import { useSdk } from '../hooks/useSdk';
import { useSdkContext } from '../context/SdkContext';
import { useForceUpdateTransactions } from '../hooks/useForceUpdate';
import { router } from 'expo-router';
import appConfig from '../config/appConfig';

// Local observable state for this component
const accountTransactionsStore = observable({
  transactions: [] as any[],
  isLoading: false,
  error: null as string | null,
  currentLimit: 25,
  lastUpdated: Date.now()
});

type AccountTransactionsListProps = {
  accountAddress: string;
  initialLimit?: number;
  testID?: string;
  onRefresh?: () => void;
  onLimitChange?: (newLimit: number) => void;
  isVisible?: boolean; // Add prop to indicate if component is visible
};

// Use the observer pattern to automatically react to changes in the observable state
export const AccountTransactionsList = observer(({
  accountAddress,
  initialLimit = 25,
  testID = 'account-transactions-list',
  onRefresh,
  onLimitChange,
  isVisible = true
}: AccountTransactionsListProps) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Use local state to track refresh, loading more, and auto refresh states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Get SDK instance
  const sdk = useSdk();
  const updateCounter = useForceUpdateTransactions();
  const { isInitialized } = useSdkContext();

  // Get the current state from the store
  const transactions = accountTransactionsStore.transactions.get();
  const isLoading = accountTransactionsStore.isLoading.get();
  const error = accountTransactionsStore.error.get();
  const currentLimit = accountTransactionsStore.currentLimit.get();

  // Add refs to track polling interval and app state
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);
  const previousLimitRef = useRef(currentLimit);

  // Effect to set up and clean up
  useEffect(() => {
    isMounted.current = true;
    console.log(`AccountTransactionsList mounted for address: ${accountAddress}`);

    // Initialize with the provided limit
    if (initialLimit !== currentLimit) {
      accountTransactionsStore.currentLimit.set(initialLimit);
    }

    // Initial fetch when component mounts
    if (isInitialized && accountAddress) {
      fetchTransactions(false, false, true);
    }

    return () => {
      console.log(`AccountTransactionsList unmounting for address: ${accountAddress}`);
      isMounted.current = false;
      stopPolling();
    };
  }, [accountAddress, isInitialized]);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Effect to notify parent component when limit changes
  useEffect(() => {
    if (onLimitChange && currentLimit !== previousLimitRef.current) {
      console.log(`Notifying parent of limit change: ${previousLimitRef.current} -> ${currentLimit}`);
      onLimitChange(currentLimit);
      previousLimitRef.current = currentLimit;
    }
  }, [currentLimit, onLimitChange]);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      console.log('App has come to the foreground, refreshing account transactions');
      if (isVisible && isInitialized && accountAddress) {
        fetchTransactions(false, true);
      }
    }
    appState.current = nextAppState;
  };

  // Auto-refresh polling
  const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

  // Auto-refresh based on visibility
  useEffect(() => {
    if (isVisible && accountAddress) {
      // Reset any lingering auto-refresh state
      setIsAutoRefreshing(false);
      startPolling();
    } else {
      stopPolling();
    }

    // Clean up polling on unmount or when component becomes invisible
    return () => {
      stopPolling();
    };
  }, [isVisible, isInitialized, accountAddress]);

  // Start polling for transactions
  const startPolling = () => {
    // Only start polling if not already polling and component is visible
    if (!pollingIntervalRef.current && isVisible && isInitialized) {
      console.log(`Starting polling for account transactions: ${accountAddress}`);

      // Reset any lingering auto-refresh state
      setIsAutoRefreshing(false);

      pollingIntervalRef.current = setInterval(() => {
        // Only poll if we're not already loading and component is still visible and mounted
        if (!isRefreshing && !isLoadingMore && !isAutoRefreshing && isVisible && isMounted.current) {
          console.log(`Auto-refreshing account transactions for ${accountAddress}`);
          fetchTransactions(false, true);
        }
      }, AUTO_REFRESH_INTERVAL);
    }
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log(`Stopping polling for account transactions: ${accountAddress}`);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Fetch transactions
  const fetchTransactions = async (isLoadMore = false, isAutoRefresh = false, isInitialFetch = false, overrideLimit?: number) => {
    // Only proceed if we have an account address and SDK is initialized
    if (!accountAddress || !isInitialized) {
      console.error('Cannot fetch transactions: Missing account address or SDK not initialized');
      if (!isInitialized) {
        accountTransactionsStore.error.set('SDK not initialized');
      } else {
        accountTransactionsStore.error.set('Invalid account address');
      }
      return;
    }

    // Set appropriate loading state
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else if (isAutoRefresh) {
      setIsAutoRefreshing(true);
    } else if (isInitialFetch) {
      accountTransactionsStore.isLoading.set(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Determine the limit to use
      const limitToUse = overrideLimit || currentLimit;
      console.log(`Fetching up to ${limitToUse} transactions for account: ${accountAddress}`);

      // Call the SDK to get account transactions
      const accountTransactions = await sdk.ext_getAccountTransactions(accountAddress, limitToUse);
      const count = accountTransactions?.length || 0;
      console.log(`Fetched ${count} transactions for account: ${accountAddress}`);

      // Only update the store if the component is still mounted
      if (isMounted.current) {
        accountTransactionsStore.transactions.set(accountTransactions || []);
        accountTransactionsStore.error.set(null);
        accountTransactionsStore.lastUpdated.set(Date.now());

        // If this was a load more operation, update the limit
        if (isLoadMore && overrideLimit) {
          accountTransactionsStore.currentLimit.set(overrideLimit);
        }
      }
    } catch (error) {
      console.error(`Error fetching account transactions for ${accountAddress}:`, error);
      if (isMounted.current) {
        accountTransactionsStore.error.set(error instanceof Error ? error.message : String(error));
      }
    } finally {
      // Reset loading states
      if (isMounted.current) {
        if (isLoadMore) {
          setIsLoadingMore(false);
        } else if (isAutoRefresh) {
          setTimeout(() => setIsAutoRefreshing(false), 500);
        } else if (isInitialFetch) {
          accountTransactionsStore.isLoading.set(false);
        } else {
          setIsRefreshing(false);
        }
      }
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    }
    fetchTransactions();
  };

  // Handle load more
  const handleLoadMore = async () => {
    if (isLoadingMore || currentLimit >= 100) return;

    const newLimit = Math.min(currentLimit + 25, 100);
    console.log(`Loading more account transactions, new limit: ${newLimit}`);
    fetchTransactions(true, false, false, newLimit);
  };

  // Sort transactions by version (descending)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      // Try to get version from different formats
      const aVersion = Number(a.version || (a.transaction && a.transaction.version) || 0);
      const bVersion = Number(b.version || (b.transaction && b.transaction.version) || 0);
      return bVersion - aVersion;
    });
  }, [transactions]);

  const handleTransactionPress = (hash: string) => {
    // Normalize the hash using our utility function
    const normalizedHash = normalizeTransactionHash(hash);

    if (!normalizedHash) {
      console.error('Invalid transaction hash:', hash);
      return;
    }

    console.log('Navigating to transaction details with normalized hash:', normalizedHash);
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

    // Check if we have a transaction object with payload
    if (item.transaction && item.transaction.payload && item.transaction.payload.function) {
      const functionPath = item.transaction.payload.function;
      const parts = functionPath.split('::');
      if (parts.length >= 3) {
        // Return the last part
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
        return type || 'unknown';
    }
  };

  // Get color for function pill based on function type using alphabetical index
  const getFunctionPillColor = (type: string, functionName: string) => {
    // First check for special mappings from config
    const normalizedType = (type || '').toLowerCase();

    // Check for special cases from config
    for (const [specialType, colors] of Object.entries(appConfig.ui.specialFunctionPills)) {
      if (normalizedType.includes(specialType)) {
        return `${colors.bg} ${colors.text}`;
      }
    }

    // Use the functionName (which is from getFunctionLabel) for consistent alphabetical indexing
    const normalizedName = (functionName || 'unknown').toLowerCase();

    // Get alphabetical position and map to color
    const firstChar = normalizedName.charAt(0);
    const charCode = firstChar.charCodeAt(0) - 'a'.charCodeAt(0);

    // Ensure positive index (in case of non-alphabetic characters)
    const index = Math.max(0, charCode) % appConfig.ui.functionPillColors.length;
    const colors = appConfig.ui.functionPillColors[index];

    return `${colors.bg} ${colors.text}`;
  };

  const renderTableHeader = () => {
    if (!isDesktop) return null;

    return (
      <View className="flex flex-row py-2.5 px-4 bg-background border-b border-border w-full">
        <Text className="font-bold text-text-muted text-sm w-1/5 font-sans text-center truncate">VERSION</Text>
        <Text className="font-bold text-text-muted text-sm w-1/5 font-sans text-center truncate">TX HASH</Text>
        <Text className="font-bold text-text-muted text-sm w-2/5 font-sans text-center truncate">FUNCTION</Text>
        <Text className="font-bold text-text-muted text-sm w-1/5 font-sans text-center truncate">TIME</Text>
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
    const functionPillColor = getFunctionPillColor(type, functionLabel);

    return (
      <TouchableOpacity
        key={hash}
        className="w-full border-b border-border"
        onPress={() => handleTransactionPress(hash)}
        testID={`transaction-${hash}`}
      >
        {!isDesktop && (
          <View className="py-3 px-4 w-full">
            <View className="w-full space-y-2">
              {/* First row */}
              <View className="w-full flex-none flex-row items-center justify-between">
                <View className={`rounded-full ${functionPillColor}`}>
                  <Text className="text-xs font-medium px-3 py-1">{functionLabel}</Text>
                </View>
                <Text className="text-white text-xs font-data">{formatNumber(version)}</Text>
              </View>

              {/* Second row */}
              <View className="w-full flex-none flex-row items-center justify-between">
                <Text className="text-white text-xs font-data">{getSenderDisplay(hash)}</Text>
                <Text className="text-white text-xs">{formatTimestamp(timestamp)}</Text>
              </View>
            </View>
          </View>
        )}

        {isDesktop && (
          <View className="flex flex-row py-3 px-4 w-full">
            <Text className="text-white text-sm w-1/5 font-data text-center">{formatNumber(version)}</Text>
            <Text className="text-white text-sm w-1/5 font-data text-center">{getSenderDisplay(hash)}</Text>
            <View className="w-2/5 flex items-center justify-center">
              <View className={`px-3 py-1 rounded-full max-w-[180px] w-auto flex items-center justify-center ${functionPillColor}`}>
                <Text className="text-xs font-medium">{functionLabel}</Text>
              </View>
            </View>
            <Text className="text-white text-sm w-1/5 text-center">{formatTimestamp(timestamp)}</Text>
          </View>
        )}
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
      <View className="w-full mb-5">
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
    <View className="w-full mb-8">
      <View className="bg-secondary rounded-lg overflow-hidden" testID={testID}>
        <View className="h-1 bg-white/10" />
        <View className="flex-row justify-between items-center p-4 border-b border-border">
          <Text className="text-lg font-bold text-white">
            Account Transactions ({transactions.length})
          </Text>
          <View className="w-8 h-8 justify-center items-center">
            {(isLoading || isAutoRefreshing || !isInitialized) ? (
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

            {/* Load More Button - Only show if not at max limit */}
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
                  <Text className="text-primary">Load More ({currentLimit} → {Math.min(currentLimit + 25, 100)})</Text>
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