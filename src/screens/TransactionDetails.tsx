import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Header } from '../components/Header';
import { useSdk } from '../hooks/useSdk';
import { TransactionDetail } from '../types/blockchain';
import { useObservable } from '@legendapp/state/react';
import { blockTimeStore } from '../store/blockTimeStore';
import { getRelativeTimeString } from '../store/blockTimeStore';
import { formatTimestamp } from '../utils/formatters';
import { normalizeAddress, formatAddressForDisplay, normalizeTransactionHash } from '../utils/addressUtils';

// Get screen width to adjust formatting for mobile
const screenWidth = Dimensions.get('window').width;
const isMobile = screenWidth < 768;

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
  route: RouteProp<RootStackParamList, 'TransactionDetails'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionDetails'>;
};

export const TransactionDetailsScreen: React.FC<TransactionDetailsScreenProps> = ({ route, navigation }) => {
  // Get hash from route params and store it in state to preserve it
  const hashFromParams = route.params.hash;
  const normalizedHash = normalizeTransactionHash(hashFromParams);
  const [hash, setHash] = useState<string | null>(normalizedHash);
  const sdk = useSdk();
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
    try {
      setLoading(true);
      setError(null);

      // DEBUG: Log the hash values
      console.log('Transaction hash from route.params:', hashFromParams);
      console.log('Normalized hash:', normalizedHash);
      console.log('Transaction hash from state:', hash);
      console.log('Type of hash:', typeof hash);

      if (!sdk.isInitialized || sdk.error) {
        throw new Error(sdk.error?.message || 'SDK is not initialized');
      }

      if (!hash) {
        throw new Error('Invalid transaction hash: the hash is missing or invalid');
      }

      // DEBUG: Log the hash about to be sent to SDK
      console.log('Hash being sent to SDK:', hash);

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

  useEffect(() => {
    if (hash) {
      fetchTransactionDetails();
    }
  }, [hash, sdk.isInitialized]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const renderStatusBadge = (status: string) => {
    const isSuccess = status === 'success';

    return (
      <View style={[styles.statusBadge, isSuccess ? styles.successBadge : styles.failureBadge]}>
        <Text style={styles.statusText}>{status.toUpperCase()}</Text>
      </View>
    );
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

    navigation.navigate('AccountDetails', { address: formattedAddress });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Header testID="header" />
        <View className="flex-1 justify-center items-center">
          <View className="mx-auto w-full max-w-screen-xl px-4">
            <View className="flex items-center justify-center p-8">
              <ActivityIndicator size="large" color="#E75A5C" />
              <Text className="mt-4 text-white text-lg">Loading transaction details...</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Header testID="header" />
        <View className="flex-1 justify-center items-center">
          <View className="mx-auto w-full max-w-screen-xl px-4">
            <View className="flex items-center justify-center p-8">
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

              {/* Debug info panel */}
              <View className="mt-6 p-3 bg-secondary rounded-md w-full max-w-md">
                <Text className="text-text-muted text-xs mb-1">Debug Info:</Text>
                <Text className="text-text-muted text-xs">Original hash: {hashFromParams || 'undefined'}</Text>
                <Text className="text-text-muted text-xs">Normalized hash: {hash || 'null'}</Text>
                <Text className="text-text-muted text-xs">Type: {typeof hash}</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Header testID="header" />
        <View className="flex-1 justify-center items-center">
          <View className="mx-auto w-full max-w-screen-xl px-4">
            <View className="flex items-center justify-center p-8">
              <Text className="text-primary text-2xl font-bold mb-4">Transaction Not Found</Text>
              <TouchableOpacity className="mt-2" onPress={handleBackPress}>
                <Text className="text-primary text-base font-bold">← Back to Transactions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header testID="header" />
      <ScrollView className="flex-1">
        <View className="mx-auto w-full max-w-screen-xl px-4">
          <View className="flex-row items-center mb-5 flex-wrap">
            <TouchableOpacity
              className="mr-4 mb-2"
              onPress={handleBackPress}
            >
              <Text className="text-primary text-base font-bold">← Back to Transactions</Text>
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold flex-1 flex-wrap">Transaction Details</Text>
          </View>

          <View className="bg-secondary rounded-lg p-4 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-text-light text-base font-bold">Transaction Hash</Text>
              <View className={`px-2 py-1 rounded ${transaction.status === 'success' ? 'bg-green-900' : 'bg-red-900'}`}>
                <Text className="text-white text-xs font-bold">{transaction.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* Hash display */}
            <View className="bg-background rounded px-3 py-2 mb-4">
              <Text className="text-text-light font-mono text-sm">{formatHashForDisplay(transaction.hash, false)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Block Height</Text>
              <Text style={styles.infoValue}>{transaction.block_height}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>{transaction.version}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Timestamp</Text>
              <Text style={styles.infoValue}>{formatTimestamp(transaction.timestamp)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sender</Text>
              <TouchableOpacity onPress={() => handleAddressPress(transaction.sender)}>
                <Text style={[styles.infoValue, styles.linkText]}>
                  {formatAddressForDisplay(transaction.sender)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sequence Number</Text>
              <Text style={styles.infoValue}>{transaction.sequence_number}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transaction Type</Text>
              <Text style={styles.infoValue}>{transaction.type}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gas Used</Text>
              <Text style={styles.infoValue}>{transaction.gas_used || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gas Unit Price</Text>
              <Text style={styles.infoValue}>{transaction.gas_unit_price || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>VM Status</Text>
              <Text style={styles.infoValue}>{transaction.vm_status || 'N/A'}</Text>
            </View>

            {transaction.epoch && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Epoch</Text>
                <Text style={styles.infoValue}>{transaction.epoch}</Text>
              </View>
            )}

            {transaction.round && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Round</Text>
                <Text style={styles.infoValue}>{transaction.round}</Text>
              </View>
            )}

            {transaction.state_change_hash && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>State Change Hash</Text>
                <Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="middle">
                  {formatHashForDisplay(transaction.state_change_hash)}
                </Text>
              </View>
            )}

            {transaction.event_root_hash && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Event Root Hash</Text>
                <Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="middle">
                  {formatHashForDisplay(transaction.event_root_hash)}
                </Text>
              </View>
            )}

            {transaction.accumulator_root_hash && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Accumulator Root Hash</Text>
                <Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="middle">
                  {formatHashForDisplay(transaction.accumulator_root_hash)}
                </Text>
              </View>
            )}
          </View>

          {transaction.events && transaction.events.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Events ({transaction.events.length})</Text>
              {transaction.events.map((event, index) => (
                <View key={index} style={styles.eventItem}>
                  <Text style={styles.eventType}>{event.type}</Text>
                  <ScrollView horizontal={isMobile} style={styles.codeScrollView}>
                    <Text style={styles.eventData}>
                      {JSON.stringify(event.data, null, 2)}
                    </Text>
                  </ScrollView>
                </View>
              ))}
            </View>
          )}

          {transaction.changes && transaction.changes.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>State Changes ({transaction.changes.length})</Text>
              {transaction.changes.map((change, index) => (
                <View key={index} style={styles.changeItem}>
                  <Text style={styles.changeType}>{change.type}</Text>
                  <TouchableOpacity onPress={() => handleAddressPress(change.address)}>
                    <Text style={[styles.changeAddress, styles.linkText]}>
                      {formatAddressForDisplay(change.address)}
                    </Text>
                  </TouchableOpacity>
                  <ScrollView horizontal={isMobile} style={styles.codeScrollView}>
                    <Text style={styles.changeData}>
                      {JSON.stringify(change.data, null, 2)}
                    </Text>
                  </ScrollView>
                </View>
              ))}
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payload</Text>
            <ScrollView horizontal={isMobile} style={styles.codeScrollView}>
              <Text style={styles.payloadData}>
                {JSON.stringify(transaction.payload, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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