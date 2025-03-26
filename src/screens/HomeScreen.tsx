import React, { useEffect, useState } from 'react';
import { View, SafeAreaView, Text, ActivityIndicator } from 'react-native';
import { Header } from '../components/Header';
import { BlockchainStats } from '../components/BlockchainStats';
import { TransactionsList } from '../components/TransactionsList';
import { blockchainActions, blockchainStore } from '../store/blockchainStore';
import { useSdk } from '../hooks/useSdk';
import { Transaction } from '../types/blockchain';

export const HomeScreen: React.FC = () => {
  const sdk = useSdk();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Create mock transactions with correct typing
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

  // Set a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (blockchainStore.stats.blockHeight.get() === null && !sdk.error) {
        setLoadingTimeout(true);
        console.log('Loading timeout reached, forcing mock data');

        // Force some mock data
        blockchainActions.setStats({
          blockHeight: 500000,
          epoch: 20,
          chainId: 'testnet'
        });

        // Generate mock transactions
        blockchainActions.setTransactions(createMockTransactions(20));
        blockchainActions.setLoading(false);
      }
    }, 3000); // After 3 seconds

    return () => clearTimeout(timer);
  }, [sdk]);

  const fetchData = async () => {
    try {
      blockchainActions.setLoading(true);

      // Fetch blockchain stats
      const [blockHeight, epoch, chainId] = await Promise.all([
        sdk.getLatestBlockHeight(),
        sdk.getLatestEpoch(),
        sdk.getChainId()
      ]);

      blockchainActions.setStats({
        blockHeight,
        epoch,
        chainId
      });

      // Fetch recent transactions
      const transactions = await sdk.getTransactions(20);

      // Add block height to each transaction (in a real app, this would come from the API)
      const transactionsWithBlockHeight = transactions.map((tx, index) => ({
        ...tx,
        block_height: blockHeight - index, // This is a simplification for our demo
      }));

      blockchainActions.setTransactions(transactionsWithBlockHeight);
      blockchainActions.setLoading(false);
    } catch (error) {
      blockchainActions.setError(error instanceof Error ? error.message : 'Unknown error');
      blockchainActions.setLoading(false);

      // If there's an error, use mock data
      setLoadingTimeout(true);
      console.log('Error fetching data, using mock data instead');

      blockchainActions.setStats({
        blockHeight: 500000,
        epoch: 20,
        chainId: 'testnet'
      });

      // Generate sample transactions on error
      blockchainActions.setTransactions(createMockTransactions(20));
    }
  };

  useEffect(() => {
    // Only fetch data if the SDK is initialized
    if (sdk.isInitialized) {
      // If there was an error initializing the SDK, update the store
      if (sdk.error) {
        blockchainActions.setError(`SDK Error: ${sdk.error.message}`);
        blockchainActions.setLoading(false);

        // If SDK initialization failed, use mock data immediately
        setLoadingTimeout(true);
        blockchainActions.setStats({
          blockHeight: 500000,
          epoch: 20,
          chainId: 'testnet'
        });

        blockchainActions.setTransactions(createMockTransactions(20));
        return;
      }

      fetchData();

      // Set up polling for new data
      const pollInterval = setInterval(async () => {
        try {
          // Only update block height and transactions for polling
          const [blockHeight, transactions] = await Promise.all([
            sdk.getLatestBlockHeight(),
            sdk.getTransactions(5) // Get only the 5 most recent transactions
          ]);

          blockchainActions.setStats({ blockHeight });

          // Add block height to the new transactions
          const transactionsWithBlockHeight = transactions.map((tx, index) => ({
            ...tx,
            block_height: blockHeight - index,
          }));

          // Add only new transactions that aren't already in the store
          const currentTransactions = transactionsWithBlockHeight.filter((tx: Transaction) =>
            !blockchainStore.transactions.peek().some((existingTx: Transaction) =>
              existingTx.hash === tx.hash
            )
          );

          // Add each new transaction individually
          currentTransactions.forEach((tx: Transaction) => {
            blockchainActions.addTransaction(tx);
          });
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 10000); // Poll every 10 seconds

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [sdk.isInitialized, sdk.error, sdk]);

  const handleRefresh = () => {
    fetchData();
  };

  // Display loading state while the SDK is initializing
  if (!sdk.isInitialized) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Header testID="header" />
        <View className="flex-1 justify-center items-center bg-background p-5">
          <ActivityIndicator size="large" color="#E75A5C" />
          <Text className="text-white text-lg mt-4 text-center">Initializing blockchain SDK...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Display error state if the SDK failed to initialize
  if (sdk.error && !loadingTimeout) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Header testID="header" />
        <View className="flex-1 justify-center items-center bg-background p-5">
          <Text className="text-primary text-2xl font-bold mb-4">RPC Connection Error</Text>
          <Text className="text-white text-base text-center mb-2">{sdk.error.message}</Text>
          <Text className="text-white text-base text-center mb-2">
            Direct connection to Open Libra RPC at {`https://rpc.openlibra.space:8080/v1`} failed
          </Text>
          {sdk.error.message.includes('CORS') && (
            <Text className="text-text-muted text-sm text-center">
              This is a CORS policy restriction in the browser environment.
              The RPC server is not allowing cross-origin requests from your domain.
            </Text>
          )}
          {sdk.error.message.includes('Failed to fetch') && (
            <Text className="text-text-muted text-sm text-center">
              Network request failed. Check your internet connection or if the RPC endpoint is accessible.
            </Text>
          )}
          <Text className="text-text-muted text-sm text-center">Using mock data instead...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If everything looks good, render the main content
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header testID="header" />
      <View className="flex-1 p-4 bg-background">
        {loadingTimeout && (
          <View className="bg-primary/20 p-2.5 rounded mb-4">
            <Text className="text-white text-sm text-center">
              Using sample data - Unable to connect to Open Libra RPC. This is simulated data.
            </Text>
            <Text className="text-white text-xs text-center">
              Connection to {`https://rpc.openlibra.space:8080/v1`} failed.
              Using standard SDK initialization without modifications.
            </Text>
          </View>
        )}
        <BlockchainStats testID="blockchain-stats" />
        <TransactionsList testID="transactions-table" onRefresh={handleRefresh} />
      </View>
    </SafeAreaView>
  );
}; 