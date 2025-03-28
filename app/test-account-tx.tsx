import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { observer } from '@legendapp/state/react';
import { useSdkContext } from '../src/context/SdkContext';
import { formatTimestamp } from '../src/utils/formatters';
import { formatAddressForDisplay, normalizeTransactionHash } from '../src/utils/addressUtils';
import { router } from 'expo-router';
import { useForceUpdate } from '../src/hooks/useForceUpdate';

// Define Transaction and TransactionDetail types for type safety
interface Transaction {
  hash: string;
  version: number;
  sender: string;
  sequence_number: number;
  timestamp: number | string;
  type: string;
  status: 'success' | 'failure' | 'pending';
  gas_used: number;
  gas_unit_price: number;
  vm_status?: string;
  block_height: number;
  function?: string | null;
}

interface TransactionDetail extends Transaction {
  transaction?: {
    hash: string;
    sender: string;
    type: string;
    expiration_timestamp_secs?: number;
  };
  events?: Array<{
    type: string;
    data: any;
  }>;
  changes?: Array<{
    type: string;
    address: string;
    path: string;
    data: any;
  }>;
  payload?: any;
}

const TestAccountTransactionsPage = observer(() => {
  const { sdk, isInitialized, isUsingMockData } = useSdkContext();
  const [address, setAddress] = useState<string>('');
  const [limit, setLimit] = useState<string>('25');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [usingFallbackMethod, setUsingFallbackMethod] = useState<boolean>(false);
  const { width } = useWindowDimensions();
  const updateCounter = useForceUpdate();
  
  // Check if we should use mobile layout
  const isMobile = width < 768;

  const fetchAccountTransactions = async () => {
    if (!address) {
      setError('Please enter an account address');
      return;
    }

    if (!isInitialized || !sdk) {
      setError('SDK not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsingFallbackMethod(false);
    
    try {
      // Normalize address format - ensure it always has the 0x prefix
      const normalizedAddress = address.startsWith('0x') ? address : `0x${address}`;
      
      // Calculate limit
      const limitNum = parseInt(limit) || 25;

      try {
        // Try using the REST API endpoint first - REST API expects the address WITH the 0x prefix
        const restUrl = `https://rpc.openlibra.space:8080/v1/accounts/${normalizedAddress}/transactions?limit=${limitNum}`;
        
        console.log(`Fetching from REST endpoint: ${restUrl}`);
        const response = await fetch(restUrl);
        
        if (!response.ok) {
          throw new Error(`REST API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if we got valid transactions data
        if (Array.isArray(data)) {
          console.log(`Found ${data.length} transactions for account ${normalizedAddress} via REST API`);
          setTransactions(data);
          
          if (data.length === 0) {
            setError('No transactions found for this account');
          }
        } else {
          throw new Error('Unexpected response format from REST API');
        }
      } catch (restError: unknown) {
        // If REST API fails, fall back to SDK filtering method
        console.error('Error using REST API:', restError);
        console.log('Falling back to SDK method');
        setUsingFallbackMethod(true);
        
        // Get all transactions and filter client-side
        const allTxs = await sdk.getTransactions(limitNum * 2, true);
        
        // Filter transactions where the sender matches our address
        const filteredTxs = allTxs.filter(tx => 
          tx.sender && 
          tx.sender.toLowerCase() === normalizedAddress.toLowerCase()
        ).slice(0, limitNum); // Apply the limit after filtering
        
        console.log(`Found ${filteredTxs.length} transactions for account ${normalizedAddress} via SDK filtering`);
        setTransactions(filteredTxs as unknown as TransactionDetail[]);
        
        if (filteredTxs.length === 0) {
          setError('No transactions found for this account');
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching transactions:', errorMessage);
      setError(`Error: ${errorMessage}`);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransactionPress = (tx: TransactionDetail) => {
    // Handle different transaction formats (direct RPC vs SDK)
    const hash = tx.hash || tx.transaction?.hash || '';
    
    // Normalize the hash using our utility function
    const normalizedHash = normalizeTransactionHash(hash);

    // Validate hash before navigation
    if (!normalizedHash) {
      console.error('Invalid transaction hash:', hash);
      return;
    }

    // Use Expo Router directly
    router.push(`/tx/${normalizedHash}`);
  };

  // Format the transaction hash for display
  const formatHash = (hash: string) => {
    if (!hash || hash.length <= 12) return hash || '';
    return formatAddressForDisplay(hash, 4, 4);
  };

  // Get display text for the hash
  const getSenderDisplay = (tx: TransactionDetail) => {
    // Get hash based on the format of the transaction data
    const hash = usingFallbackMethod 
      ? tx.hash // SDK format
      : tx.transaction?.hash || tx.hash || ''; // REST API format or fallback to hash
    return formatHash(hash);
  };

  const formatNumber = (num: number | string | undefined) => {
    if (num === undefined) return '0';
    return Number(num).toLocaleString();
  };

  // Determine function label based on transaction type
  const getFunctionLabel = (tx: TransactionDetail) => {
    // Get type based on the format of the transaction data
    const type = usingFallbackMethod 
      ? tx.type // SDK format
      : tx.transaction?.type || tx.type || ''; // REST API format
    
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
  const getFunctionPillColor = (tx: TransactionDetail) => {
    // Get type based on the format of the transaction data
    const type = usingFallbackMethod 
      ? tx.type // SDK format
      : tx.transaction?.type || tx.type || ''; // REST API format
    
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

  const renderTransactionItem = (tx: TransactionDetail, index: number) => {
    const functionLabel = getFunctionLabel(tx);
    const functionPillColor = getFunctionPillColor(tx);
    
    // Get transaction data based on the format (SDK vs REST API)
    const version = usingFallbackMethod 
      ? tx.version // SDK format
      : tx.version || 0; // REST API format
      
    const timestamp = usingFallbackMethod 
      ? tx.timestamp // SDK format
      : (tx.transaction?.expiration_timestamp_secs ? tx.transaction.expiration_timestamp_secs * 1000 : null) || 
        tx.timestamp || 
        Date.now(); // Try different timestamp sources
      
    const sender = usingFallbackMethod 
      ? tx.sender // SDK format
      : tx.transaction?.sender || tx.sender || ''; // REST API format

    // Mobile view with stacked layout
    if (isMobile) {
      return (
        <TouchableOpacity
          key={usingFallbackMethod ? tx.hash : (tx.transaction?.hash || tx.hash || index)}
          className="py-3 px-4 border-b border-border"
          onPress={() => handleTransactionPress(tx)}
        >
          <View className="flex-row justify-between items-center mb-2">
            <View className={`px-3 py-1 rounded-full w-[150px] flex items-center justify-center ${functionPillColor}`}>
              <Text className="text-xs font-medium">{functionLabel}</Text>
            </View>
            <Text className="text-white text-xs">{formatTimestamp(timestamp)}</Text>
          </View>

          <View className="flex-row mb-1">
            <Text className="text-text-muted text-xs mr-2">Tx Hash:</Text>
            <Text className="text-white text-xs font-data">{getSenderDisplay(tx)}</Text>
          </View>

          <View className="flex-row justify-between">
            <View className="flex-row">
              <Text className="text-text-muted text-xs mr-2">Version:</Text>
              <Text className="text-white text-xs font-data">{formatNumber(version)}</Text>
            </View>
            <View className="flex-row">
              <Text className="text-text-muted text-xs mr-2">Sender:</Text>
              <Text className="text-white text-xs font-data">{formatAddressForDisplay(sender)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Desktop view with row layout
    return (
      <TouchableOpacity
        key={usingFallbackMethod ? tx.hash : (tx.transaction?.hash || tx.hash || index)}
        className="flex-row py-3 px-4 border-b border-border"
        onPress={() => handleTransactionPress(tx)}
      >
        <Text className="text-white text-sm flex-1 min-w-[120px] font-data text-center">{formatNumber(version)}</Text>
        <Text className="text-white text-sm flex-1 min-w-[160px] font-data text-center">{getSenderDisplay(tx)}</Text>
        <View className="flex-1 min-w-[120px] flex items-center justify-center">
          <View className={`px-3 py-1 rounded-full w-[150px] flex items-center justify-center ${functionPillColor}`}>
            <Text className="text-xs font-medium">{functionLabel}</Text>
          </View>
        </View>
        <Text className="text-white text-sm flex-1 min-w-[180px] text-center">{formatTimestamp(timestamp)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="mx-auto w-full max-w-screen-lg px-4 my-5">
        <View className="bg-secondary rounded-lg p-4 mb-4">
          <Text className="text-lg text-white font-bold mb-4">Account Transactions</Text>
          
          {isUsingMockData && (
            <View className="bg-yellow-800 p-3 rounded-md mb-4">
              <Text className="text-white">Using mock data. This feature may not work correctly in mock mode.</Text>
            </View>
          )}
          
          <View className="mb-4">
            <Text className="text-white mb-2">Account Address:</Text>
            <TextInput
              className="bg-surface text-white p-3 rounded-md"
              placeholder="Enter account address (0x...)"
              placeholderTextColor="#6b7280"
              value={address}
              onChangeText={setAddress}
            />
          </View>
          
          <View className="mb-4">
            <Text className="text-white mb-2">Limit (max transactions):</Text>
            <TextInput
              className="bg-surface text-white p-3 rounded-md"
              placeholder="25"
              placeholderTextColor="#6b7280"
              value={limit}
              onChangeText={setLimit}
              keyboardType="numeric"
            />
          </View>
          
          <TouchableOpacity
            className="bg-primary p-3 rounded-md"
            onPress={fetchAccountTransactions}
            disabled={isLoading}
          >
            <Text className="text-white text-center font-medium">
              {isLoading ? 'Loading...' : 'Get Account Transactions'}
            </Text>
          </TouchableOpacity>
          
          {error && (
            <View className="bg-red-900 p-3 rounded-md mt-4">
              <Text className="text-white">{error}</Text>
            </View>
          )}
        </View>
        
        {isLoading && (
          <View className="bg-secondary rounded-lg p-8 flex items-center justify-center">
            <ActivityIndicator size="large" color="#E75A5C" />
            <Text className="mt-4 text-base text-white">Loading transactions...</Text>
          </View>
        )}
        
        {!isLoading && transactions.length > 0 && (
          <View className="bg-secondary rounded-lg overflow-hidden">
            <View className="h-1 bg-white/10" />
            <View className="flex-row justify-between items-center p-4 border-b border-border">
              <Text className="text-lg font-bold text-white">
                Account Transactions ({transactions.length})
                {usingFallbackMethod && (
                  <Text className="text-sm text-gray-400"> (using SDK fallback method)</Text>
                )}
              </Text>
            </View>
            
            {renderTableHeader()}
            
            <View className="w-full">
              {transactions.map((tx, index) => renderTransactionItem(tx, index))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
});

export default TestAccountTransactionsPage; 