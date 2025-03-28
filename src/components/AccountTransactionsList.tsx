import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  AppState,
  AppStateStatus
} from 'react-native';
import { observer } from '@legendapp/state/react';
import { formatTimestamp } from '../utils/formatters';
import { formatAddressForDisplay, normalizeTransactionHash } from '../utils/addressUtils';
import { useSdk } from '../hooks/useSdk';
import { router } from 'expo-router';
import appConfig from '../config/appConfig';
import { useSdkContext } from '../context/SdkContext';

// Polling interval in milliseconds - could be moved to appConfig
const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds (changed from 30 seconds)

type AccountTransactionsListProps = {
  accountAddress: string;
  initialLimit?: number;
  testID?: string;
  onRefresh?: () => void;
  onLimitChange?: (newLimit: number) => void;
  isVisible?: boolean; // Add prop to indicate if component is visible
};

// Use observer pattern to correctly handle observables
export const AccountTransactionsList = observer(({
  accountAddress,
  initialLimit = 25, // Changed from appConfig.transactions.defaultLimit to hardcoded 25
  testID,
  onRefresh,
  onLimitChange,
  isVisible = true // Default to true if not provided
}: AccountTransactionsListProps) => {
  // State for transactions and loading
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  // Track the current limit for pagination
  const [currentLimit, setCurrentLimit] = useState(initialLimit);
  // Add state to track auto-refresh
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  // Add ref to track polling interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Add ref to track app state
  const appState = useRef(AppState.currentState);
  // Track if component is mounted
  const isMounted = useRef(true);
  
  const { width } = useWindowDimensions();
  const sdk = useSdk();
  const { isInitialized, isUsingMockData } = useSdkContext();

  // Effect to notify parent component when limit changes
  useEffect(() => {
    if (onLimitChange && currentLimit !== initialLimit) {
      onLimitChange(currentLimit);
    }
  }, [currentLimit, initialLimit, onLimitChange]);

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
      console.log('App has come to the foreground, refreshing account transactions');
      if (isVisible && accountAddress) {
        fetchTransactions(false, true);
      }
    }
    appState.current = nextAppState;
  };

  // Check if we should use mobile layout
  const isMobile = width < 768;

  // Sort transactions by version (descending) and then by timestamp (most recent first)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      // Extract version numbers, handling different data formats
      const versionA = Number(a.version || a.sequence_number || 0);
      const versionB = Number(b.version || b.sequence_number || 0);
      
      // First sort by version (block number) in descending order
      if (versionB !== versionA) {
        return versionB - versionA;
      }
      
      // Extract timestamps, handling different formats
      const timestampA = new Date(
        a.timestamp || 
        (a.transaction?.expiration_timestamp_secs ? a.transaction.expiration_timestamp_secs * 1000 : 0)
      ).getTime();
      
      const timestampB = new Date(
        b.timestamp || 
        (b.transaction?.expiration_timestamp_secs ? b.transaction.expiration_timestamp_secs * 1000 : 0)
      ).getTime();
      
      // If versions are equal, sort by timestamp in descending order
      return timestampB - timestampA;
    });
  }, [transactions]);

  // Load transactions on component mount
  useEffect(() => {
    if (accountAddress && isVisible) {
      fetchTransactions(false, false, true); // Initial fetch, use current limit
    }
  }, [accountAddress, isVisible]);

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
  }, [isVisible, isInitialized, isUsingMockData, accountAddress]);

  // Start polling interval
  const startPolling = () => {
    // Only start polling if not already polling, component is visible, SDK is initialized and not using mock data
    if (!pollingIntervalRef.current && isVisible && isInitialized && !isUsingMockData && accountAddress) {
      console.log('Starting polling for account transactions');
      
      // Reset any lingering auto-refresh state
      setIsAutoRefreshing(false);
      
      // Force an immediate refresh when starting polling
      setTimeout(() => {
        console.log('Initial account transactions refresh');
        setIsAutoRefreshing(true);
        fetchTransactions(false, true)
          .finally(() => {
            if (isMounted.current) {
              setTimeout(() => setIsAutoRefreshing(false), 500);
            }
          });
      }, 200);
      
      pollingIntervalRef.current = setInterval(() => {
        // Only poll if we're not already loading and component is still visible and mounted
        if (!isLoading && !isLoadingMore && !isAutoRefreshing && isVisible && isMounted.current) {
          console.log('[POLL] Auto-refreshing account transactions');
          // Set auto-refreshing flag to true
          setIsAutoRefreshing(true);
          // Fetch transactions with current limit - use auto-refresh flag, not initial fetch
          // Use current limit directly to avoid race conditions
          const limitToUse = currentLimit;
          fetchTransactions(false, true, false, limitToUse)
            .finally(() => {
              // Reset auto-refreshing flag when done
              if (isMounted.current) {
                setTimeout(() => {
                  setIsAutoRefreshing(false);
                }, 500); // Short delay to ensure the user sees the refresh indicator
              }
            });
        } else {
          console.log('[POLL] Skipping transactions refresh, conditions not met:', {
            isLoading, isLoadingMore, isAutoRefreshing, isVisible, isMounted: isMounted.current
          });
        }
      }, AUTO_REFRESH_INTERVAL);
      
      console.log(`Auto-refresh interval set to ${AUTO_REFRESH_INTERVAL}ms`);
    }
  };

  // Stop polling interval
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('Stopping polling for account transactions');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Function to fetch transactions
  const fetchTransactions = async (isLoadMore = false, isAutoRefresh = false, isInitialFetch = false, overrideLimit?: number) => {
    try {
      // For manual refreshes and initial loads, set loading state
      if (!isLoadMore && !isAutoRefresh) {
        setIsLoading(true);
        setError(null);
        
        // Only clear transactions on initial fetch, not on manual refresh
        if (isInitialFetch) {
          setTransactions([]);
        }
      } else if (isLoadMore) {
        // For "load more", still show loading indicator
        setIsLoadingMore(true);
      }
      // For auto-refresh, we don't modify the loading state to avoid UI flickering
      
      // Use override limit if provided (to avoid race conditions), otherwise use currentLimit
      const limitToUse = overrideLimit !== undefined ? overrideLimit : currentLimit;
      
      console.log(`Fetching transactions for account: ${accountAddress}, limit: ${limitToUse}, isAutoRefresh: ${isAutoRefresh}`);
      const accountTxs = await sdk.ext_getAccountTransactions(accountAddress, limitToUse);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        // Replace with new transactions - we're getting everything in one go
        setTransactions(accountTxs);
        
        if (accountTxs.length === 0) {
          setError('No transactions found for this account');
        }
      }
    } catch (e: any) {
      console.error('Error fetching account transactions:', e);
      if (isMounted.current) {
        setError(e.message || 'Failed to load transactions');
      }
    } finally {
      if (isMounted.current) {
        // Reset loading states based on the type of refresh
        if (!isAutoRefresh) {
          setIsLoading(false);
        }
        if (isLoadMore) {
          setIsLoadingMore(false);
        }
      }
    }
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    }
    // Don't reset to initial limit - keep the user's current view preference
    await fetchTransactions(false, false, false); // Use current limit for manual refresh
  };
  
  // Handle load more button click
  const handleLoadMore = async () => {
    // Always allow loading more when button is clicked
    // Calculate the new limit first
    const newLimit = Math.min(currentLimit + 25, 100);
    
    // Set loading state immediately
    setIsLoadingMore(true);
    
    try {
      console.log(`Increasing fetch limit to ${newLimit}`);
      
      // Update state with new limit
      setCurrentLimit(newLimit);
      
      // Use fetchTransactions with the override limit to avoid race condition
      await fetchTransactions(true, false, false, newLimit);
      console.log(`Loaded transactions with new limit ${newLimit}`);
    } catch (error) {
      console.error('Error loading more transactions:', error);
      if (isMounted.current) {
        setError('Failed to load more transactions');
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingMore(false);
      }
    }
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
    // Handle different data formats (REST API vs SDK)
    const hash = item.hash || item.transaction?.hash || '';
    const version = item.version || 0;
    const type = item.type || item.transaction?.type || '';
    const timestamp = item.timestamp || 
                      (item.transaction?.expiration_timestamp_secs ? item.transaction.expiration_timestamp_secs * 1000 : null) || 
                      Date.now();
    
    const functionLabel = getFunctionLabel(type, item);
    const functionPillColor = getFunctionPillColor(type, functionLabel);

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
            {isAutoRefreshing && (
              <ActivityIndicator size="small" color="#E75A5C" style={{ marginLeft: 8 }} />
            )}
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