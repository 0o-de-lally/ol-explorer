import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
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
import { normalizeAddress } from '../utils/addressUtils';

type TransactionDetailsScreenProps = {
  route: RouteProp<RootStackParamList, 'TransactionDetails'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionDetails'>;
};

export const TransactionDetailsScreen: React.FC<TransactionDetailsScreenProps> = ({ route, navigation }) => {
  const { hash } = route.params;
  const sdk = useSdk();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blockTimeMs = useObservable(blockTimeStore.blockTimeMs);
  const isCalculatingBlockTime = useObservable(blockTimeStore.isCalculating);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!sdk.isInitialized || sdk.error) {
        throw new Error(sdk.error?.message || 'SDK is not initialized');
      }

      if (!hash) {
        throw new Error('Transaction hash is required');
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

  useEffect(() => {
    fetchTransactionDetails();
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
      <SafeAreaView style={styles.safeArea}>
        <Header testID="header" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E75A5C" />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header testID="header" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Transaction</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTransactionDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back to Transactions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header testID="header" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Transaction Not Found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back to Transactions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header testID="header" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back to Transactions</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Transaction Details</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.topRow}>
            <Text style={styles.hashTitle}>Transaction Hash</Text>
            {renderStatusBadge(transaction.status)}
          </View>
          <Text style={styles.hash}>{transaction.hash}</Text>

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
              <Text style={[styles.infoValue, styles.linkText]}>{transaction.sender}</Text>
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
              <Text style={styles.infoValue}>{transaction.state_change_hash}</Text>
            </View>
          )}

          {transaction.event_root_hash && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Event Root Hash</Text>
              <Text style={styles.infoValue}>{transaction.event_root_hash}</Text>
            </View>
          )}

          {transaction.accumulator_root_hash && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Accumulator Root Hash</Text>
              <Text style={styles.infoValue}>{transaction.accumulator_root_hash}</Text>
            </View>
          )}
        </View>

        {transaction.events && transaction.events.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Events ({transaction.events.length})</Text>
            {transaction.events.map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <Text style={styles.eventType}>{event.type}</Text>
                <Text style={styles.eventData}>
                  {JSON.stringify(event.data, null, 2)}
                </Text>
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
                  <Text style={[styles.changeAddress, styles.linkText]}>{change.address}</Text>
                </TouchableOpacity>
                <Text style={styles.changeData}>
                  {JSON.stringify(change.data, null, 2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payload</Text>
          <Text style={styles.payloadData}>
            {JSON.stringify(transaction.payload, null, 2)}
          </Text>
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
  },
  backButton: {
    marginRight: 16,
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
  },
  hashTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  hash: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#0D1626',
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3a50',
    paddingBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#ADBAC7',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 2,
    textAlign: 'right',
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
  eventData: {
    fontSize: 12,
    color: '#ADBAC7',
    fontFamily: 'monospace',
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
    fontFamily: 'monospace',
  },
  payloadData: {
    fontSize: 12,
    color: '#ADBAC7',
    fontFamily: 'monospace',
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