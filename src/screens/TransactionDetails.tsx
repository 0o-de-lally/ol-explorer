import React, { useEffect, useState } from 'react';
import {View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Platform, useWindowDimensions} from 'react-native';
import {TransactionDetail} from '../types/blockchain';
import {useObservable} from '@legendapp/state/react';
import {blockTimeStore} from '../store/blockTimeStore';
import {formatTimestamp} from '../utils/formatters';
import {normalizeAddress, formatAddressForDisplay, normalizeTransactionHash} from '../utils/addressUtils';
import {useSdkContext} from '../context/SdkContext';
import {MaterialIcons} from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import {navigate} from '../navigation/navigationUtils';
import appConfig from '../config/appConfig';
import {getTransactionStatus, getStatusPillStyle} from '../utils/transactionUtils';

/**
 * Get color for function pill based on function type using alphabetical index
 */
const getFunctionPillColor = (type: string, functionName?: string) => {
  // Use the function name if provided, otherwise use the type
  const textToUse = functionName?.toLowerCase() || type.toLowerCase();

  // First check for special mappings from config
  const normalizedType = type.toLowerCase();

  // Check for special cases from config
  for (const [specialType, colors] of Object.entries(appConfig.ui.specialFunctionPills)) {
    if (normalizedType.includes(specialType)) {
      return `${colors.bg} ${colors.text}`;
    }
  }

  // Get alphabetical position and map to color
  const firstChar = textToUse.charAt(0);
  const charCode = firstChar.charCodeAt(0) - 'a'.charCodeAt(0);

  // Ensure positive index (in case of non-alphabetic characters)
  const index = Math.max(0, charCode) % appConfig.ui.functionPillColors.length;
  const colors = appConfig.ui.functionPillColors[index];

  return `${colors.bg} ${colors.text}`;
};

/**
 * Format a hash value for display
 * - For small screens: Shows abbreviated version with ellipsis
 * - For larger screens: Shows full hash
 */
const formatHashForDisplay = (hash: string, abbreviate = true): string => {
  if (!hash) return '';

  // If abbreviation is requested (for small screens or other purposes)
  if (abbreviate) {
    return formatAddressForDisplay(hash, 10, 8); // Show more characters for hashes
  }

  return hash;
};

// Format number with commas for thousands
const formatNumber = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined || isNaN(Number(num))) return '-';
  return Number(num).toLocaleString();
};

// Transaction detail card component for consistent styling
const DetailCard = ({ label, value, style = {} }: { label: string; value: React.ReactNode, style?: any }) => {
  return (
    <View style={[{
      backgroundColor: 'rgba(26, 34, 53, 0.5)',
      borderRadius: 8,
      padding: 12,
    }, style]}>
      <Text className="text-text-muted text-xs mb-1">{label}</Text>
      <View className="flex-row items-center flex-wrap">
        {typeof value === 'string' ? (
          <Text className="text-text-light font-bold text-base">{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

// Two-column grid container that works on both web and native
const DetailGrid = ({ children }: { children: React.ReactNode }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Convert children to array and chunk into pairs for desktop
  const childrenArray = React.Children.toArray(children);

  if (isDesktop) {
    // Desktop layout - 2 items per row
    const rows = [];
    for (let i = 0; i < childrenArray.length; i += 2) {
      const pair = childrenArray.slice(i, i + 2);
      rows.push(
        <View key={i} className="flex-row gap-4 mb-4">
          {pair.map((child, index) => (
            <View key={index} style={{ flex: 1 }}>
              {child}
            </View>
          ))}
          {pair.length === 1 && <View style={{ flex: 1 }} />} {/* Empty space for odd items */}
        </View>
      );
    }
    return <>{rows}</>;
  } else {
    // Mobile layout - 1 item per row
    return (
      <>
        {childrenArray.map((child, index) => (
          <View key={index} className="mb-2">
            {child}
          </View>
        ))}
      </>
    );
  }
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
            {/* Mobile layout */}
            <View className="md:hidden">
              <View className="flex-row justify-between items-center mb-3">
                <View className={`px-3 py-1 rounded-full ${getStatusPillStyle(getTransactionStatus(transaction))}`}>
                  <Text className="text-white text-xs font-bold">
                    {getTransactionStatus(transaction).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-text-light text-sm">Version {transaction.version}</Text>
              </View>

              <View className="mb-4">
                <View className="flex-row items-center">
                  <View className="bg-background rounded px-3 py-2 flex-1">
                    <TouchableOpacity onPress={() => copyToClipboard(transaction.hash)}>
                      <Text className="text-text-light font-mono text-sm">
                        {isDesktop ? transaction.hash : formatHashForDisplay(transaction.hash, true)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(transaction.hash)}
                    className="p-1.5 bg-primary rounded-md ml-2 flex items-center justify-center w-8 h-8"
                  >
                    <MaterialIcons name="content-copy" size={14} color="white" />
                  </TouchableOpacity>
                </View>
                <Text className="text-text-muted text-xs mt-2">{formatTimestamp(transaction.timestamp)}</Text>
              </View>
            </View>

            {/* Desktop layout */}
            <View className="hidden md:block">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-text-light text-base font-bold">Transaction Hash</Text>
                <View className={`px-2 py-1 rounded ${getStatusPillStyle(getTransactionStatus(transaction))}`}>
                  <Text className="text-white text-xs font-bold">
                    {getTransactionStatus(transaction).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center mb-4">
                <View className="bg-background rounded px-3 py-2 flex-1">
                  <TouchableOpacity onPress={() => copyToClipboard(transaction.hash)}>
                    <Text className="text-text-light font-mono text-sm">
                      {isDesktop ? transaction.hash : formatHashForDisplay(transaction.hash, true)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => copyToClipboard(transaction.hash)}
                  className="p-1.5 bg-primary rounded-md ml-2 flex items-center justify-center w-8 h-8"
                >
                  <MaterialIcons name="content-copy" size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sender Information */}
            {transaction.sender && transaction.sender.trim() !== '' && (
              <View className="border-b border-border/20 pb-4 mb-4">
                <Text className="text-white font-bold text-base mb-3">Sender Information</Text>

                <View className="flex-row justify-between items-center py-3">
                  <Text className="text-text-muted text-base w-1/3">Address</Text>
                  <View className="w-2/3 flex-row justify-end items-center">
                    <TouchableOpacity
                      onPress={() => handleAddressPress(transaction.sender)}
                    >
                      <Text className="text-primary text-base font-medium text-right mr-2">
                        {isDesktop ? transaction.sender : formatAddressForDisplay(transaction.sender, 6, 4)}
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
              </View>
            )}

            {/* Basic Information */}
            <View className="border-b border-border/20 pb-4 mb-4">
              <Text className="text-white font-bold text-base mb-3">Basic Information</Text>

              <DetailGrid>
                <DetailCard
                  label="Transaction Type"
                  value={
                    <View className={`px-3 py-1 rounded-full ${getFunctionPillColor(transaction.type,
                      transaction.payload?.function?.split('::').pop() || undefined)}`}>
                      <Text className="text-sm font-bold">
                        {(() => {
                          if (transaction.payload?.function) {
                            const functionPath = transaction.payload.function;
                            const parts = functionPath.split('::');
                            if (parts.length >= 3) {
                              return parts[parts.length - 1];
                            }
                          }
                          if (transaction.type.endsWith('_transaction')) {
                            return transaction.type.replace('_transaction', '');
                          }
                          return transaction.type;
                        })()}
                      </Text>
                    </View>
                  }
                />
                <DetailCard label="Version" value={formatNumber(transaction.version)} />
              </DetailGrid>

              <DetailGrid>
                <DetailCard label="Timestamp" value={formatTimestamp(transaction.timestamp)} />
                <DetailCard label="Sequence Number" value={transaction.sequence_number.toString()} />
              </DetailGrid>

              {(transaction.epoch || transaction.round) && (
                <DetailGrid>
                  {transaction.epoch && <DetailCard label="Epoch" value={transaction.epoch.toString()} />}
                  {transaction.round && <DetailCard label="Round" value={transaction.round.toString()} />}
                </DetailGrid>
              )}
            </View>

            {/* Gas and Execution */}
            <View className="border-b border-border/20 pb-4 mb-4">
              <Text className="text-white font-bold text-base mb-3">Gas and Execution</Text>

              <DetailGrid>
                <DetailCard label="Gas Used" value={transaction.gas_used || 'N/A'} />
                <DetailCard label="Gas Unit Price" value={transaction.gas_unit_price || 'N/A'} />
              </DetailGrid>

              <DetailGrid>
                <DetailCard label="VM Status" value={transaction.vm_status || 'N/A'} />
              </DetailGrid>
            </View>

            {/* Cryptographic Hashes */}
            {(transaction.state_change_hash || transaction.event_root_hash || transaction.accumulator_root_hash) && (
              <View>
                <Text className="text-white font-bold text-base mb-3">Cryptographic Hashes</Text>

                {/* First row */}
                {transaction.state_change_hash && (
                  <DetailGrid>
                    <DetailCard
                      label="State Change Hash"
                      value={isDesktop ? transaction.state_change_hash : formatHashForDisplay(transaction.state_change_hash)}
                    />
                    {transaction.event_root_hash && (
                      <DetailCard
                        label="Event Root Hash"
                        value={isDesktop ? transaction.event_root_hash : formatHashForDisplay(transaction.event_root_hash)}
                      />
                    )}
                  </DetailGrid>
                )}

                {/* Handle case where we only have event root hash */}
                {!transaction.state_change_hash && transaction.event_root_hash && (
                  <DetailGrid>
                    <DetailCard
                      label="Event Root Hash"
                      value={isDesktop ? transaction.event_root_hash : formatHashForDisplay(transaction.event_root_hash)}
                    />
                    {transaction.accumulator_root_hash && (
                      <DetailCard
                        label="Accumulator Root Hash"
                        value={isDesktop ? transaction.accumulator_root_hash : formatHashForDisplay(transaction.accumulator_root_hash)}
                      />
                    )}
                  </DetailGrid>
                )}

                {/* Show accumulator root hash in second row if we have state_change_hash */}
                {transaction.state_change_hash && transaction.accumulator_root_hash && (
                  <DetailGrid>
                    <DetailCard
                      label="Accumulator Root Hash"
                      value={isDesktop ? transaction.accumulator_root_hash : formatHashForDisplay(transaction.accumulator_root_hash)}
                    />
                  </DetailGrid>
                )}
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

          {/* Move Payload section up, right after the main transaction details */}
          {transaction.payload &&
            Object.keys(transaction.payload).length > 0 && (
              <View className="bg-secondary rounded-lg p-6 mb-6 border-t-4 border-green-500">
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
                    className="p-1.5 bg-green-500 rounded-md flex-row items-center justify-center px-3"
                  >
                    <MaterialIcons name="content-copy" size={14} color="white" />
                    <Text className="text-white text-xs ml-1.5">Payload</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          {transaction.events && transaction.events.length > 0 && (
            <View className="bg-secondary rounded-lg p-6 mb-6 border-t-4 border-purple-500">
              <Text className="text-text-light text-lg font-bold mb-3">Events ({transaction.events.length})</Text>
              {transaction.events.map((event, index) => (
                <View key={index} className="bg-background rounded mb-2">
                  <View className="p-3 flex-row justify-between items-center">
                    <Text className="text-primary text-sm font-bold">{event.type}</Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(JSON.stringify(event.data, null, 2))}
                      className="p-1.5 bg-purple-500 rounded-md flex items-center justify-center w-8 h-8"
                    >
                      <MaterialIcons name="content-copy" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                  <View className="p-3 border-t border-border bg-background">
                    <View className="overflow-auto">
                      <Text className="text-white font-mono text-xs whitespace-pre">
                        {JSON.stringify(event.data, null, 2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              {/* Add copy button at bottom right */}
              <View className="flex-row justify-end mt-4">
                <TouchableOpacity
                  onPress={() => copyToClipboard(JSON.stringify(transaction.events, null, 2))}
                  className="p-1.5 bg-purple-500 rounded-md flex-row items-center justify-center px-3"
                >
                  <MaterialIcons name="content-copy" size={14} color="white" />
                  <Text className="text-white text-xs ml-1.5">All Events</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {transaction.changes && transaction.changes.length > 0 && (
            <View className="bg-secondary rounded-lg p-6 mb-6 border-t-4 border-amber-500">
              <Text className="text-text-light text-lg font-bold mb-3">
                State Changes ({transaction.changes.filter(change =>
                  !(Object.keys(change.data).length === 0 && change.address === "" && change.path === "")
                ).length})
              </Text>
              {transaction.changes
                .filter(change =>
                  !(Object.keys(change.data).length === 0 && change.address === "" && change.path === "")
                )
                .map((change, index) => (
                  <View key={index} className="bg-background rounded mb-2">
                    <View className="p-3 flex-row justify-between items-center">
                      <View>
                        <Text className="text-primary text-sm font-bold">{change.type}</Text>
                        <TouchableOpacity onPress={() => handleAddressPress(change.address)}>
                          <Text className="text-primary text-sm mt-1">
                            {isDesktop ? change.address : formatAddressForDisplay(change.address)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => copyToClipboard(JSON.stringify(change.data, null, 2))}
                        className="p-1.5 bg-amber-500 rounded-md flex items-center justify-center w-8 h-8"
                      >
                        <MaterialIcons name="content-copy" size={14} color="white" />
                      </TouchableOpacity>
                    </View>
                    <View className="p-3 border-t border-border bg-background">
                      <View className="overflow-auto">
                        <Text className="text-white font-mono text-xs whitespace-pre">
                          {JSON.stringify(change.data, null, 2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              {/* Add copy button at bottom right */}
              <View className="flex-row justify-end mt-4">
                <TouchableOpacity
                  onPress={() => copyToClipboard(JSON.stringify(transaction.changes, null, 2))}
                  className="p-1.5 bg-amber-500 rounded-md flex-row items-center justify-center px-3"
                >
                  <MaterialIcons name="content-copy" size={14} color="white" />
                  <Text className="text-white text-xs ml-1.5">All Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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