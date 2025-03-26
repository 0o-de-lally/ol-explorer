import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Header } from '../components/Header';
import { useSdk } from '../hooks/useSdk';
import { Account, AccountResource } from '../types/blockchain';

type AccountDetailsScreenProps = {
  route: RouteProp<RootStackParamList, 'AccountDetails'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountDetails'>;
};

export const AccountDetailsScreen: React.FC<AccountDetailsScreenProps> = ({ route, navigation }) => {
  const { address } = route.params;
  const sdk = useSdk();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedResources, setExpandedResources] = useState<Set<number>>(new Set());

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate the address first
      if (!address || typeof address !== 'string') {
        throw new Error('Invalid account address format');
      }

      // Check SDK initialization
      if (!sdk.isInitialized || sdk.error) {
        throw new Error(sdk.error?.message || 'SDK is not initialized');
      }

      console.log(`Fetching account details for: ${address}`);
      const accountData = await sdk.getAccount(address);

      if (!accountData) {
        throw new Error(`Account with address ${address} not found`);
      }

      // Validate the returned account data
      if (!accountData.address) {
        throw new Error('Received invalid account data from API');
      }

      console.log('Account data received:', JSON.stringify(accountData, null, 2));
      setAccount(accountData);
    } catch (err) {
      console.error('Error fetching account details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountDetails();
  }, [address, sdk.isInitialized]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const formatBalance = (balance: number) => {
    // Format with commas for thousands and include 8 decimal places
    return (balance / 100000000).toLocaleString(undefined, {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8
    });
  };

  const toggleResourceExpansion = (index: number) => {
    setExpandedResources(prevState => {
      const newState = new Set(prevState);
      if (newState.has(index)) {
        newState.delete(index);
      } else {
        newState.add(index);
      }
      return newState;
    });
  };

  const renderResourceItem = (resource: AccountResource, index: number) => {
    const isExpanded = expandedResources.has(index);

    // Get a simplified type name for display
    const typeDisplay = resource.type.split('::').slice(-2).join('::');

    // Determine if this is a coin resource
    const isCoinResource = resource.type.includes('::coin::') || resource.type.includes('Coin');

    // Get an appropriate icon/color based on resource type
    const resourceColor = isCoinResource ? '#4CAF50' : '#3498db';

    return (
      <View key={index} style={styles.resourceItem}>
        <TouchableOpacity
          style={[styles.resourceHeader, { borderLeftColor: resourceColor, borderLeftWidth: 4 }]}
          onPress={() => toggleResourceExpansion(index)}
        >
          <Text style={styles.resourceType}>{typeDisplay}</Text>
          <Text style={styles.resourceExpandBtn}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.resourceDataContainer}>
            <Text style={styles.resourceFullType}>{resource.type}</Text>
            <Text style={styles.resourceData}>
              {JSON.stringify(resource.data, null, 2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header testID="header" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E75A5C" />
          <Text style={styles.loadingText}>Loading account details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header testID="header" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Account</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAccountDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header testID="header" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Account Not Found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back</Text>
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
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Account Details</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.topRow}>
            <Text style={styles.addressTitle}>Account Address</Text>
          </View>
          <Text style={styles.address}>{account.address}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Balance</Text>
            <Text style={styles.infoValue}>{formatBalance(account.balance)} OL</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sequence Number</Text>
            <Text style={styles.infoValue}>{account.sequence_number}</Text>
          </View>
        </View>

        {account.resources && account.resources.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Resources ({account.resources.length})</Text>
              <TouchableOpacity onPress={() => setExpandedResources(expandedResources.size === 0
                ? new Set(account.resources.map((_, i) => i))
                : new Set()
              )}>
                <Text style={styles.expandAllText}>
                  {expandedResources.size === 0 ? 'Expand All' : 'Collapse All'}
                </Text>
              </TouchableOpacity>
            </View>

            {account.resources.map((resource, index) => renderResourceItem(resource, index))}
          </View>
        )}
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
  addressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  address: {
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
  sectionCard: {
    backgroundColor: '#172234',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  expandAllText: {
    color: '#E75A5C',
    fontSize: 14,
  },
  resourceItem: {
    marginBottom: 12,
    backgroundColor: '#0D1626',
    borderRadius: 4,
    overflow: 'hidden',
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  resourceType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  resourceExpandBtn: {
    fontSize: 14,
    color: '#E75A5C',
    marginLeft: 8,
  },
  resourceDataContainer: {
    borderTopWidth: 1,
    borderTopColor: '#2c3a50',
    padding: 12,
  },
  resourceFullType: {
    fontSize: 12,
    color: '#8F9BB3',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  resourceData: {
    fontSize: 12,
    color: '#ADBAC7',
    fontFamily: 'monospace',
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
    textAlign: 'center',
    marginBottom: 24,
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