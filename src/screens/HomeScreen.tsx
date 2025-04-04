import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, AppState, AppStateStatus } from 'react-native';
import { BlockchainStats } from '../components/BlockchainStats';
import { TransactionsList } from '../components/TransactionsList';
import { blockchainActions, blockchainStore } from '../store/blockchainStore';
import { useSdk } from '../hooks/useSdk';
import { useSdkContext } from '../context/SdkContext';
import { Transaction } from '../types/blockchain';
import { BlockchainMetrics } from '../components/BlockchainMetrics';
import { SearchBar } from '../components/SearchBar';
import sdkConfig from '../config/sdkConfig';
import appConfig from '../config/appConfig';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Container, Grid } from '../components/Layout';

// Debug flag - must match the one in SdkContext.tsx
const DEBUG_MODE = false;

export const HomeScreen: React.FC<{ isVisible?: boolean }> = ({ isVisible = true }) => {
  const sdk = useSdk();
  const { isInitialized, isInitializing, error, isUsingMockData, reinitialize } = useSdkContext();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  // Keep track of whether we've attempted data fetch
  const dataFetchAttempted = useRef(false);
  // Track manual retry attempts
  const [retryCount, setRetryCount] = useState(0);
  // Use the currentLimit from the blockchain store instead of local state
  const currentLimit = blockchainStore.currentLimit.get();
  // Add refs for visibility tracking
  const isMounted = useRef(true);
  const appState = useRef(AppState.currentState);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Try to use navigation focus hook if available
  let isFocused = true;
  try {
    isFocused = useIsFocused();
  } catch (e) {
    // If hook is not available, default to true
    isFocused = true;
  }

  // Determine if screen is actually visible based on props and navigation
  const isScreenVisible = isVisible && isFocused;

  const router = useRouter();

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
      console.log('App has come to the foreground, refreshing home screen data');
      if (isScreenVisible) {
        fetchData(true);
      }
    }
    appState.current = nextAppState;
  };

  // Set a timeout to prevent infinite loading
  useEffect(() => {
    // Only set a timeout if we're in debug mode
    if (!sdkConfig.debugMode) return;

    const timer = setTimeout(() => {
      if (blockchainStore.stats.blockHeight.get() === null && !sdk.error) {
        setLoadingTimeout(true);
        console.log('Loading timeout reached in debug mode');

        // Only use mock data in debug mode
        if (sdkConfig.debugMode) {
          console.log('Debug mode enabled, using mock data');
          // Set mock stats and transactions
          blockchainActions.setStats({
            blockHeight: 500000,
            epoch: 20,
            chainId: 'testnet'
          });
          blockchainActions.setTransactions(createMockTransactions(currentLimit));
        }

        blockchainActions.setLoading(false);
      }
    }, 5000); // 5 seconds timeout

    return () => clearTimeout(timer);
  }, [sdk, currentLimit]);

  // Create mock transactions with correct typing (only used in debug mode)
  const createMockTransactions = (count: number): Transaction[] => {
    return Array.from({ length: count }).map((_, index) => ({
      hash: `0x${Math.random().toString(16).substring(2, 42)}`,
      version: 100000 - index,
      sender: `0x${Math.random().toString(16).substring(2, 42)}`,
      sequence_number: Math.floor(Math.random() * 100),
      timestamp: Date.now() - index * 60000, // Each tx is 1 minute apart
      type: ['script', 'module', 'entry_function'][Math.floor(Math.random() * 3)],
      status: Math.random() > 0.2 ? 'success' : 'failure',
      gas_used: Math.floor(Math.random() * 1000),
      gas_unit_price: Math.floor(Math.random() * 100),
      vm_status: 'Executed successfully',
      block_height: 500000 - index,
    }));
  };

  // Handle manual refresh - just fetch data directly
  const handleRefresh = () => {
    console.log('Manual refresh triggered with current limit:', currentLimit);
    fetchData();
  };

  // Handle transaction limit changes from the TransactionsList component
  const handleLimitChange = (newLimit: number) => {
    const currentStoreLimit = blockchainStore.currentLimit.get();
    // Only update if the value actually changed to avoid unnecessary renders
    if (newLimit !== currentStoreLimit) {
      console.log(`Transaction limit changed to ${newLimit}`);
      // Update the limit in the store
      blockchainActions.setCurrentLimit(newLimit);
    }
  };

  // Set up polling for data updates based on visibility
  useEffect(() => {
    if (isScreenVisible && isInitialized && !isUsingMockData) {
      startPolling();
    } else {
      stopPolling();
    }

    // Clean up on unmount
    return () => {
      stopPolling();
    };
  }, [isScreenVisible, isInitialized, isUsingMockData]);

  // Start polling interval
  const startPolling = () => {
    if (!pollingIntervalRef.current) {
      console.log('Starting polling interval for blockchain data...');

      // Set up polling for new data using the configured interval
      pollingIntervalRef.current = setInterval(() => {
        // Only poll if we're not already loading and component is still visible and mounted
        if (!blockchainStore.isLoading.get() && isScreenVisible && isMounted.current) {
          console.log('Polling for new blockchain data with current limit:', currentLimit);
          fetchData(true); // Pass true to indicate this is an auto-refresh
        }
      }, sdkConfig.pollingIntervals.homeScreenRefresh);
    }
  };

  // Stop polling interval
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('Stopping polling interval for blockchain data');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const fetchData = async (isAutoRefresh = false) => {
    try {
      console.log(`Fetching blockchain data with limit: ${currentLimit}, auto-refresh: ${isAutoRefresh}`);
      dataFetchAttempted.current = true;

      if (!isAutoRefresh) {
        // Only set loading state for manual refreshes to avoid UI flicker
        blockchainActions.setLoading(true);
      }

      blockchainActions.setError(null);

      // Fetch blockchain stats
      const [blockHeight, epoch, chainId] = await Promise.all([
        sdk.getLatestBlockHeight(),
        sdk.getLatestEpoch(),
        sdk.getChainId()
      ]);

      // Only update state if component is still mounted
      if (!isMounted.current) return;

      console.log('Blockchain data fetched:', { blockHeight, epoch, chainId });

      // Explicitly update each stat individually to ensure UI updates
      blockchainActions.setStats({
        blockHeight,
        epoch,
        chainId
      });

      // Force update to store values in case the reactive system isn't updating
      console.log('After setting stats:', {
        height: blockchainStore.stats.blockHeight.get(),
        epoch: blockchainStore.stats.epoch.get(),
        chainId: blockchainStore.stats.chainId.get()
      });

      // Fetch recent transactions - use the current limit to respect user preference
      console.log(`Fetching transactions with current limit: ${currentLimit}`);
      const transactions = await sdk.getTransactions(currentLimit);

      // Only update state if component is still mounted
      if (!isMounted.current) return;

      console.log(`Fetched ${transactions.length} transactions`);

      // Add block height to each transaction if needed
      const transactionsWithBlockHeight = transactions.map((tx, index) => ({
        ...tx,
        block_height: tx.block_height || blockHeight - index,
      }));

      // Set transactions and force update
      blockchainActions.setTransactions(transactionsWithBlockHeight);
      console.log('After setting transactions:', {
        count: blockchainStore.transactions.get().length
      });
    } catch (error) {
      console.error('Error fetching blockchain data:', error);

      // Only update state if component is still mounted
      if (!isMounted.current) return;

      blockchainActions.setError(error instanceof Error ? error.message : 'Unknown error');

      // Only use mock data in debug mode if there's an error
      if (sdkConfig.debugMode) {
        console.log('Error fetching data, using debug mock data');
        blockchainActions.setStats({
          blockHeight: 500000,
          epoch: 20,
          chainId: 'testnet'
        });
        blockchainActions.setTransactions(createMockTransactions(currentLimit));
      }
    } finally {
      // Ensure loading state is cleared only if component is still mounted
      if (isMounted.current) {
        blockchainActions.setLoading(false);
        console.log('Finished loading data, loading state:', blockchainStore.isLoading.get());
      }
    }
  };

  // Initialize data as soon as SDK becomes initialized or when retryCount changes
  useEffect(() => {
    if (isInitialized) {
      console.log('SDK initialized, fetching initial data...');

      // Reset the data fetch flag if we're retrying
      if (retryCount > 0) {
        dataFetchAttempted.current = false;
      }

      // Force immediate state update to clear any stale state
      // Using undefined instead of null to avoid type errors
      blockchainActions.setStats({
        blockHeight: undefined,
        epoch: undefined,
        chainId: undefined
      });
      blockchainActions.setTransactions([]);

      // Force a state update to ensure UI refreshes
      blockchainActions.forceUpdate();

      // Fetch data only if not already attempted
      if (!dataFetchAttempted.current) {
        setTimeout(() => {
          fetchData();
        }, 100);  // Short delay to ensure the state reset has propagated
      }
    }
  }, [isInitialized, retryCount]);

  // Add another effect to enforce data refresh if we have initialized but no data
  useEffect(() => {
    const blockHeight = blockchainStore.stats.blockHeight.get();
    const hasTransactions = blockchainStore.transactions.get().length > 0;

    if (isInitialized && !isInitializing && !blockchainStore.isLoading.get() &&
      ((blockHeight === null || blockHeight === undefined) || !hasTransactions)) {
      console.log('Detected initialized SDK but missing data, forcing refresh...');

      if (!dataFetchAttempted.current) {
        fetchData();
      } else {
        console.log('Data fetch already attempted, not retrying automatically');
      }
    }
  }, [isInitialized, isInitializing, blockchainStore.stats.blockHeight.get(),
    blockchainStore.transactions.get().length]);

  // Handle retry when SDK fails to initialize
  const handleRetryInitialization = () => {
    console.log('Manual SDK reinitialization triggered');
    setRetryCount(prev => prev + 1);
    reinitialize();
  };

  // Handle the SDK initialized event
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSdkInitialized = () => {
        console.log('SDK initialized event received, forcing refresh');
        // Reset the data fetch flag to force a new fetch
        dataFetchAttempted.current = false;
        // Increment retry count to trigger a refresh
        setRetryCount(prev => prev + 1);
      };

      window.addEventListener('sdkinitialized', handleSdkInitialized);

      return () => {
        window.removeEventListener('sdkinitialized', handleSdkInitialized);
      };
    }
  }, []);

  // Display loading state if we're still waiting for data
  const isDataLoading = blockchainStore.isLoading.get() &&
    !dataFetchAttempted.current &&
    !blockchainStore.stats.blockHeight.get();

  // This will check if we should show the loading screen or actual content
  const shouldShowLoadingScreen =
    // Show loading screen during SDK initialization
    isInitializing ||
    // Or during initial data load, but only if we don't have any blockchain data yet
    (isDataLoading &&
      !blockchainStore.stats.blockHeight.get() &&
      blockchainStore.transactions.get().length === 0 &&
      !dataFetchAttempted.current);

  // Add a fallback in case the loading gets stuck
  useEffect(() => {
    // If we're in loading state for too long, force exit it
    if (shouldShowLoadingScreen) {
      const timer = setTimeout(() => {
        dataFetchAttempted.current = true;
        blockchainActions.setLoading(false);
        console.log('Forced exit from loading state due to timeout');
      }, 10000); // 10 second timeout

      return () => clearTimeout(timer);
    }
  }, [shouldShowLoadingScreen]);

  if (shouldShowLoadingScreen) {
    return (
      <View className="bg-background py-8">
        <View className="justify-center items-center p-16">
          <ActivityIndicator size="large" color="#E75A5C" />
          <Text className="text-white text-lg mt-4 text-center">
            {isInitializing ? "Initializing blockchain connection..." : "Loading blockchain data..."}
          </Text>
        </View>
      </View>
    );
  }

  // Display error state if the SDK failed to initialize and we're not using mock data
  if (error && !isInitialized && !isUsingMockData && !sdkConfig.debugMode) {
    return (
      <View className="bg-background py-8">
        <View className="justify-center items-center p-16">
          <Text className="text-primary text-2xl font-bold mb-4">RPC Connection Error</Text>
          <Text className="text-white text-base text-center mb-2">{error.message}</Text>
          <Text className="text-white text-base text-center mb-4">
            Connection to Open Libra RPC at {sdkConfig.rpcUrl} failed
          </Text>
          <Text className="text-text-muted text-sm text-center mb-6">
            Please check your internet connection or try again later.
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-lg p-3 justify-center items-center"
            onPress={handleRetryInitialization}
          >
            <Text className="text-white text-base font-bold">Retry Connection</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If everything looks good, render the main content
  return (
    <View className="bg-background flex-1">
      <ScrollView>
        <Container width="lg" centered={true}>
          {/* Show debug warning if using mock data */}
          {isUsingMockData && (
            <View className="bg-primary/20 p-2.5 rounded mb-4">
              <Text className="text-white text-sm text-center">
                DEBUG MODE: Using sample data - Unable to connect to Open Libra RPC
              </Text>
              <Text className="text-white text-xs text-center">
                This is simulated data for development purposes only
              </Text>
            </View>
          )}

          <Grid cols={1} gap={6} fullBleed={true} className="mb-4">
            {/* Blockchain metrics card */}
            <BlockchainMetrics />

            {/* Transactions list */}
            <TransactionsList
              testID="transactions-list"
              onRefresh={handleRefresh}
              initialLimit={appConfig.transactions.defaultLimit}
              onLimitChange={handleLimitChange}
            />

            {/* Developer button */}
            <TouchableOpacity
              className="ml-2 bg-purple-700 rounded-lg px-3 py-1.5 w-fit"
              onPress={() => router.push('/view')}
            >
              <Text className="text-white text-sm">Developer</Text>
            </TouchableOpacity>
          </Grid>
        </Container>
      </ScrollView>
    </View>
  );
}; 