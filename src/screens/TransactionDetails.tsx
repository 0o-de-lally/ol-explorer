import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Dimensions, Platform, ScrollView, Alert } from 'react-native';
import { TransactionDetail } from '../types/blockchain';
import { useObservable } from '@legendapp/state/react';
import { blockTimeStore } from '../store/blockTimeStore';
import { formatTimestamp } from '../utils/formatters';
import { normalizeAddress, formatAddressForDisplay, normalizeTransactionHash } from '../utils/addressUtils';
import { useSdkContext } from '../context/SdkContext';
import { MaterialIcons } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import { useWindowDimensions } from 'react-native';
import { navigate } from '../navigation/navigationUtils';

// Get screen width to adjust formatting for mobile
const screenWidth = Dimensions.get('window').width;
const isMobile = screenWidth < 768;

/**
 * Get color for function pill based on function type
 */
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

/**
 * Format a hash value for display
 * - For mobile: Shows abbreviated version with ellipsis
 * - For desktop: Shows full hash
 */
const formatHashForDisplay = (hash: string, mobile = isMobile): string => {
  if (!hash) return '';

  // Always keep the 0x prefix
  if (mobile) {
    return formatAddressForDisplay(hash, 10, 8); // Show more characters for hashes
  }

  return hash;
};

type TransactionDetailsScreenProps = {
  route?: { params: { hash: string } };
  hash?: string;
};

export const TransactionDetailsScreen: React.FC<TransactionDetailsScreenProps> = ({ route, hash: propHash }) => {
  // Get hash from route params or props and store it in state to preserve it
  const hashFromParams = route?.params?.hash || propHash;
  const normalizedHash = normalizeTransactionHash(hashFromParams);
  const [hash, setHash] = useState<string | null>(normalizedHash);
  const { sdk } = useSdkContext();
  const { isInitialized, isInitializing } = useSdkContext();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blockTimeMs = useObservable(blockTimeStore.blockTimeMs);
  const isCalculatingBlockTime = useObservable(blockTimeStore.isCalculating);

  // Update hash in state if route params change
  useEffect(() => {
    const newNormalizedHash = normalizeTransactionHash(hashFromParams);
    if (newNormalizedHash && newNormalizedHash !== hash) {
      console.log('Updating hash from route params:', hashFromParams);
      console.log('Normalized hash:', newNormalizedHash);
      setHash(newNormalizedHash);
    }
  }, [hashFromParams]);

  const fetchTransactionDetails = async () => {
    if (!isInitialized || !sdk) {
      console.log('SDK not initialized yet, waiting...');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!hash) {
        throw new Error('Invalid transaction hash: the hash is missing or invalid');
      }

      const txDetails = await sdk.getTransactionByHash(hash);

      if (!txDetails) {
        throw new Error(
          'Transaction not found. This could mean:\n\n' +
          '• The transaction is still processing\n' +
          '• The transaction hash is incorrect\n' +
          '• The transaction has been pruned from the node\'s history'
        );
      }

      setTransaction(txDetails);
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Attempt to fetch transaction when SDK initializes or hash changes
  useEffect(() => {
    if (hash && isInitialized) {
      fetchTransactionDetails();
    }
  }, [hash, isInitialized]);

  // Add an event listener for SDK initialization
  useEffect(() => {
    const handleSdkInitialized = () => {
      console.log('SDK initialized event received in Transaction Details');
      if (hash) {
        fetchTransactionDetails();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sdkinitialized', handleSdkInitialized);
      return () => {
        window.removeEventListener('sdkinitialized', handleSdkInitialized);
      };
    }
  }, [hash]);

  const handleBackPress = () => {
    // Use the navigation utility for consistent navigation
    navigate('Home');
  };

  const handleAddressPress = (address: string) => {
    // Validate the address before navigating
    if (!address || typeof address !== 'string') {
      console.error('Invalid address:', address);
      return;
    }

    // Normalize address using the same function everywhere
    const formattedAddress = normalizeAddress(address);
    console.log(`Navigating to account details for: ${formattedAddress} (original: ${address})`);

    // Use the navigation utility for consistent navigation
    navigate('AccountDetails', { address: formattedAddress });
  };

  // Function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setString(text);
      // Show feedback (optional)
      if (Platform.OS !== 'web') {
        Alert.alert('Copied', 'Copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Show loading state with blockchain connection indicator
  if (!isInitialized && isInitializing) {
    return (
      <View className="bg-background py-8">
        <View className="mx-auto w-full max-w-screen-xl px-4">
          <View className="items-center justify-center p-8">
            <ActivityIndicator size="large" color="#E75A5C" />
            <Text className="mt-4 text-white text-lg">Connecting to blockchain...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="bg-background py-8">
        <View className="mx-auto w-full max-w-screen-xl px-4">
          <View className="items-center justify-center p-8">
            <ActivityIndicator size="large" color="#E75A5C" />
            <Text className="mt-4 text-white text-lg">Loading transaction details...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-background py-8">
        <View className="mx-auto w-full max-w-screen-xl px-4">
          <View className="items-center justify-center p-8">
            <Text className="text-primary text-2xl font-bold mb-4">Error Loading Transaction</Text>
            <Text className="text-white text-base text-center mb-6">{error}</Text>
            <TouchableOpacity
              className="bg-primary rounded-lg py-3 px-6 mb-4"
              onPress={() => {
                // Ensure we have a valid hash before retrying
                console.log('Retry button clicked with hash:', hash);

                // If hash is null, use a fallback mechanism or show error
                if (!hash) {
                  console.error('Cannot retry: Invalid hash value');
                  setError('Cannot retry: transaction hash is missing or invalid');
                  return;
                }

                fetchTransactionDetails();
              }}
            >
              <Text className="text-white font-bold text-base">Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity className="mt-2" onPress={handleBackPress}>
              <Text className="text-primary text-base font-bold">← Back to Transactions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Only show "Transaction Not Found" after SDK is initialized, loading is complete, and we have no transaction data
  if (!transaction && isInitialized && !loading) {
    return (
      <View className="bg-background py-8">
        <View className="mx-auto w-full max-w-screen-xl px-4">
          <View className="items-center justify-center p-8">
            <Text className="text-primary text-2xl font-bold mb-4">Transaction Not Found</Text>
            <TouchableOpacity className="mt-2" onPress={handleBackPress}>
              <Text className="text-primary text-base font-bold">← Back to Transactions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Safeguard against null transaction (should not happen due to above check, but TypeScript needs it)
  if (!transaction) {
    return null; // This will never render due to the previous check
  }

  return (
    <View className="bg-background flex-1">
      <ScrollView>
        <View className="mx-auto w-full max-w-screen-lg px-6 py-6">
          <Text className="text-white text-2xl font-bold mb-5">Transaction Details</Text>

          <View className="bg-secondary rounded-lg p-6 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-text-light text-base font-bold">Transaction Hash</Text>
              <View className={`px-2 py-1 rounded ${transaction.status === 'success' ? 'bg-green-900' : 'bg-red-900'}`}>
                <Text className="text-white text-xs font-bold">{transaction.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* Hash display with copy button to the right */}
            <View className="flex-row items-center mb-4">
              <View className="bg-background rounded px-3 py-2 flex-1">
                <Text className="text-text-light font-mono text-sm">{formatHashForDisplay(transaction.hash, false)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => copyToClipboard(transaction.hash)}
                className="p-1.5 bg-primary rounded-md ml-2 flex items-center justify-center w-8 h-8"
              >
                <MaterialIcons name="content-copy" size={14} color="white" />
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-text-muted text-sm w-1/3">Version</Text>
              <Text className="text-white text-sm w-2/3 text-right">{transaction.version}</Text>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-text-muted text-sm w-1/3">Timestamp</Text>
              <Text className="text-white text-sm w-2/3 text-right">{formatTimestamp(transaction.timestamp)}</Text>
            </View>

            {transaction.sender && transaction.sender.trim() !== '' && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-text-muted text-sm w-1/3">Sender</Text>
                <View className="w-2/3 flex-row justify-end items-center">
                  <TouchableOpacity onPress={() => handleAddressPress(transaction.sender)}>
                    <Text className="text-primary text-sm text-right mr-2">
                      {formatAddressForDisplay(transaction.sender)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(transaction.sender)}
                    className="p-1.5 bg-primary rounded-md flex items-center justify-center w-8 h-8"
                  >
                    <MaterialIcons name="content-copy" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-text-muted text-sm w-1/3">Sequence Number</Text>
              <Text className="text-white text-sm w-2/3 text-right">{transaction.sequence_number}</Text>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-text-muted text-sm w-1/3">Transaction Type</Text>
              <View className="w-2/3 flex items-end justify-end">
                <View className={`px-3 py-1 rounded-full ${getFunctionPillColor(transaction.type)}`}>
                  <Text className="text-xs font-medium">{transaction.type}</Text>
                </View>
              </View>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-text-muted text-sm w-1/3">Gas Used</Text>
              <Text className="text-white text-sm w-2/3 text-right">{transaction.gas_used || 'N/A'}</Text>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-text-muted text-sm w-1/3">Gas Unit Price</Text>
              <Text className="text-white text-sm w-2/3 text-right">{transaction.gas_unit_price || 'N/A'}</Text>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-text-muted text-sm w-1/3">VM Status</Text>
              <Text className="text-white text-sm w-2/3 text-right">{transaction.vm_status || 'N/A'}</Text>
            </View>

            {transaction.epoch && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-text-muted text-sm w-1/3">Epoch</Text>
                <Text className="text-white text-sm w-2/3 text-right">{transaction.epoch}</Text>
              </View>
            )}

            {transaction.round && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-text-muted text-sm w-1/3">Round</Text>
                <Text className="text-white text-sm w-2/3 text-right">{transaction.round}</Text>
              </View>
            )}

            {transaction.state_change_hash && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-text-muted text-sm w-1/3">State Change Hash</Text>
                <Text className="text-white text-sm w-2/3 break-all text-right">
                  {formatHashForDisplay(transaction.state_change_hash)}
                </Text>
              </View>
            )}

            {transaction.event_root_hash && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-text-muted text-sm w-1/3">Event Root Hash</Text>
                <Text className="text-white text-sm w-2/3 break-all text-right">
                  {formatHashForDisplay(transaction.event_root_hash)}
                </Text>
              </View>
            )}

            {transaction.accumulator_root_hash && (
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-text-muted text-sm w-1/3">Accumulator Root Hash</Text>
                <Text className="text-white text-sm w-2/3 break-all text-right">
                  {formatHashForDisplay(transaction.accumulator_root_hash)}
                </Text>
              </View>
            )}

            {/* Add copy button at bottom right */}
            <View className="flex-row justify-end mt-4">
              <TouchableOpacity
                onPress={() => copyToClipboard(JSON.stringify(transaction, null, 2))}
                className="p-1.5 bg-primary rounded-md flex-row items-center justify-center px-3"
              >
                <MaterialIcons name="content-copy" size={14} color="white" />
                <Text className="text-white text-xs ml-1.5">Transaction</Text>
              </TouchableOpacity>
            </View>
          </View>

          {transaction.events && transaction.events.length > 0 && (
            <View className="bg-secondary rounded-lg p-6 mb-6">
              <Text className="text-text-light text-lg font-bold mb-3">Events ({transaction.events.length})</Text>
              {transaction.events.map((event, index) => (
                <View key={index} className="bg-background rounded p-3 mb-2">
                  <Text className="text-primary text-sm font-bold mb-2">{event.type}</Text>
                  <View className="overflow-auto">
                    <Text className="text-white font-mono text-xs whitespace-pre">
                      {JSON.stringify(event.data, null, 2)}
                    </Text>
                  </View>
                </View>
              ))}
              {/* Add copy button at bottom right */}
              <View className="flex-row justify-end mt-4">
                <TouchableOpacity
                  onPress={() => copyToClipboard(JSON.stringify(transaction.events, null, 2))}
                  className="p-1.5 bg-primary rounded-md flex-row items-center justify-center px-3"
                >
                  <MaterialIcons name="content-copy" size={14} color="white" />
                  <Text className="text-white text-xs ml-1.5">Events</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {transaction.changes && transaction.changes.length > 0 && (
            <View className="bg-secondary rounded-lg p-6 mb-6">
              <Text className="text-text-light text-lg font-bold mb-3">State Changes ({transaction.changes.length})</Text>
              {transaction.changes.map((change, index) => (
                <View key={index} className="bg-background rounded p-3 mb-2">
                  <Text className="text-primary text-sm font-bold mb-1">{change.type}</Text>
                  <TouchableOpacity onPress={() => handleAddressPress(change.address)}>
                    <Text className="text-primary text-sm mb-2">
                      {formatAddressForDisplay(change.address)}
                    </Text>
                  </TouchableOpacity>
                  <View className="overflow-auto">
                    <Text className="text-white font-mono text-xs whitespace-pre">
                      {JSON.stringify(change.data, null, 2)}
                    </Text>
                  </View>
                </View>
              ))}
              {/* Add copy button at bottom right */}
              <View className="flex-row justify-end mt-4">
                <TouchableOpacity
                  onPress={() => copyToClipboard(JSON.stringify(transaction.changes, null, 2))}
                  className="p-1.5 bg-primary rounded-md flex-row items-center justify-center px-3"
                >
                  <MaterialIcons name="content-copy" size={14} color="white" />
                  <Text className="text-white text-xs ml-1.5">State Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View className="bg-secondary rounded-lg p-6 mb-6">
            <Text className="text-text-light text-lg font-bold mb-3">Payload</Text>
            <View className="bg-background rounded p-3 overflow-auto">
              <Text className="text-white font-mono text-xs whitespace-pre">
                {JSON.stringify(transaction.payload, null, 2)}
              </Text>
            </View>
            {/* Add copy button at bottom right */}
            <View className="flex-row justify-end mt-4">
              <TouchableOpacity
                onPress={() => copyToClipboard(JSON.stringify(transaction.payload, null, 2))}
                className="p-1.5 bg-primary rounded-md flex-row items-center justify-center px-3"
              >
                <MaterialIcons name="content-copy" size={14} color="white" />
                <Text className="text-white text-xs ml-1.5">Payload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1221',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0B1221',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  backButton: {
    marginRight: 16,
    marginBottom: 8,
  },
  backButtonText: {
    color: '#E75A5C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    flexWrap: 'wrap',
  },
  infoCard: {
    backgroundColor: '#172234',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  hashTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hashContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#0D1626',
    borderRadius: 4,
  },
  hash: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexWrap: 'wrap',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3a50',
    paddingBottom: 12,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    color: '#ADBAC7',
    flex: 1,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 2,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  linkText: {
    color: '#E75A5C',
    textDecorationLine: 'underline',
  },
  sectionCard: {
    backgroundColor: '#172234',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  successBadge: {
    backgroundColor: '#4CAF50',
  },
  failureBadge: {
    backgroundColor: '#E75A5C',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  eventItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#0D1626',
    borderRadius: 4,
  },
  eventType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  codeScrollView: {
    maxWidth: '100%',
  },
  eventData: {
    fontSize: 12,
    color: '#ADBAC7',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  changeItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#0D1626',
    borderRadius: 4,
  },
  changeType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  changeAddress: {
    fontSize: 14,
    color: '#E75A5C',
    marginBottom: 8,
  },
  changeData: {
    fontSize: 12,
    color: '#ADBAC7',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  payloadData: {
    fontSize: 12,
    color: '#ADBAC7',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 12,
    backgroundColor: '#0D1626',
    borderRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1221',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1221',
    padding: 20,
  },
  errorTitle: {
    color: '#E75A5C',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'left',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#E75A5C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 