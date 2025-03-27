import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Account, AccountResource } from '../types/blockchain';
import Clipboard from '@react-native-clipboard/clipboard';
import { isValidAddressFormat } from '../utils/addressUtils';
import { useSdkContext } from '../context/SdkContext';
import { navigate } from '../navigation/navigationUtils';

type AccountDetailsScreenProps = {
  route?: { params: { address: string } };
  address?: string;
};

// Coin resource type for LibraCoin
const LIBRA_COIN_RESOURCE_TYPE = "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>";

export const AccountDetailsScreen: React.FC<AccountDetailsScreenProps> = ({ route, address: propAddress }) => {
  const addressFromParams = route?.params?.address || propAddress;
  const { sdk } = useSdkContext();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedResources, setExpandedResources] = useState<Set<number>>(new Set());
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate the address first
      if (!addressFromParams || typeof addressFromParams !== 'string') {
        throw new Error('Invalid account address format');
      }

      // Validate address format
      if (!isValidAddressFormat(addressFromParams)) {
        throw new Error(`Invalid address format: ${addressFromParams}`);
      }

      // Check SDK initialization
      if (!sdk) {
        throw new Error('SDK is not initialized');
      }

      console.log(`Fetching account details for: ${addressFromParams}`);

      // Use the SDK to fetch account data - address normalization happens in the SDK
      try {
        const accountData = await sdk.getAccount(addressFromParams);

        if (!accountData) {
          throw new Error(`Account with address ${addressFromParams} not found`);
        }

        // Validate the returned account data
        if (!accountData.address) {
          throw new Error('Received invalid account data from API');
        }

        console.log('Account data received:', JSON.stringify(accountData, null, 2));
        setAccount(accountData);
      } catch (resourceError) {
        console.error('Error fetching account resources:', resourceError);
        throw new Error(`Failed to fetch account: ${resourceError instanceof Error ? resourceError.message : 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error fetching account details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch account details when the component mounts or when address changes
  useEffect(() => {
    if (sdk) {
      fetchAccountDetails();
    }
  }, [addressFromParams, sdk]);

  const handleBackPress = () => {
    navigate('Home');
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

  const copyToClipboard = (text: string) => {
    try {
      Clipboard.setString(text);
      setCopySuccess('Address copied!');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Clipboard operation failed:', err);
    }
  };

  if (loading) {
    return (
      <View className="bg-background flex-1">
        <View className="items-center justify-center p-16">
          <ActivityIndicator size="large" color="#E75A5C" />
          <Text className="mt-4 text-white text-lg text-center">Loading account details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-background flex-1">
        <View className="items-center justify-center p-16">
          <Text className="text-primary text-2xl font-bold mb-4">Error Loading Account</Text>
          <Text className="text-white text-base text-center mb-6">{error}</Text>
          <TouchableOpacity
            className="bg-primary rounded-lg py-3 px-6 mb-4"
            onPress={fetchAccountDetails}
          >
            <Text className="text-white font-bold text-base">Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-2" onPress={handleBackPress}>
            <Text className="text-primary text-base font-bold">← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!account) {
    return (
      <View className="bg-background flex-1">
        <View className="items-center justify-center p-16">
          <Text className="text-primary text-2xl font-bold mb-4">Account Not Found</Text>
          <TouchableOpacity className="mt-2" onPress={handleBackPress}>
            <Text className="text-primary text-base font-bold">← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <ScrollView>
        <View className="mx-auto w-full max-w-screen-lg px-4 py-4">
          <View className="flex-row items-center mb-5 flex-wrap">
            <TouchableOpacity
              className="mr-4 mb-2"
              onPress={handleBackPress}
            >
              <Text className="text-primary text-base font-bold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold flex-1 flex-wrap">Account Details</Text>
          </View>

          <View className="bg-secondary rounded-lg p-4 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-text-light text-base font-bold">Account Address</Text>
              <TouchableOpacity onPress={() => copyToClipboard(account.address)}>
                <Text className="text-primary text-sm">Copy</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-background rounded px-3 py-2 mb-4 relative">
              <Text className="text-text-light font-mono text-sm">{account.address}</Text>
              {copySuccess && (
                <View className="absolute right-2 top-2 bg-green-800/80 px-2 py-1 rounded">
                  <Text className="text-white text-xs">{copySuccess}</Text>
                </View>
              )}
            </View>

            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-text-muted text-sm w-1/3">Balance</Text>
              <Text className="text-white text-sm w-2/3 text-right">{formatBalance(account.balance)} OL</Text>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-text-muted text-sm w-1/3">Sequence Number</Text>
              <Text className="text-white text-sm w-2/3 text-right">{account.sequence_number}</Text>
            </View>
          </View>

          {account.resources && account.resources.length > 0 && (
            <View className="bg-secondary rounded-lg p-4 mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-text-light text-lg font-bold">Resources ({account.resources.length})</Text>
                <TouchableOpacity onPress={() => setExpandedResources(expandedResources.size === 0
                  ? new Set(account.resources.map((_, i) => i))
                  : new Set()
                )}>
                  <Text className="text-primary text-sm">
                    {expandedResources.size === 0 ? 'Expand All' : 'Collapse All'}
                  </Text>
                </TouchableOpacity>
              </View>

              {account.resources.map((resource, index) => {
                const isExpanded = expandedResources.has(index);
                const typeDisplay = resource.type.split('::').slice(-2).join('::');
                const isCoinResource = resource.type.includes('::coin::') || resource.type.includes('Coin');
                const borderColor = isCoinResource ? 'border-green-600' : 'border-blue-600';

                return (
                  <View key={index} className="bg-background rounded mb-2 overflow-hidden">
                    <TouchableOpacity
                      className={`flex-row justify-between items-center p-3 border-l-4 ${borderColor}`}
                      onPress={() => toggleResourceExpansion(index)}
                    >
                      <Text className="text-white font-bold text-sm flex-1">{typeDisplay}</Text>
                      <Text className="text-primary ml-2">{isExpanded ? '▼' : '▶'}</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View className="p-3 border-t border-border">
                        <Text className="text-text-muted text-xs font-mono mb-2">{resource.type}</Text>
                        <View className="overflow-auto">
                          <Text className="text-text-light font-mono text-xs whitespace-pre">
                            {JSON.stringify(resource.data, null, 2)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}; 