import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { Account, AccountResource } from '../types/blockchain';
import Clipboard from '@react-native-clipboard/clipboard';
import { isValidAddressFormat } from '../utils/addressUtils';
import { useSdkContext } from '../context/SdkContext';
import { navigate } from '../navigation/navigationUtils';
import { useLocalSearchParams, router } from 'expo-router';

type AccountDetailsScreenProps = {
  route?: { params: { address: string; resource?: string } };
  address?: string;
};

// Coin resource type for LibraCoin
const LIBRA_COIN_RESOURCE_TYPE = "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>";
const LIBRA_DECIMALS = 8;

export const AccountDetailsScreen: React.FC<AccountDetailsScreenProps> = ({ route, address: propAddress }) => {
  const params = useLocalSearchParams();
  const addressFromParams = (route?.params?.address || propAddress || params?.address) as string;
  const resourceFromParams = (route?.params?.resource || params?.resource) as string | undefined;

  const { sdk } = useSdkContext();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedResources, setExpandedResources] = useState<Set<number>>(new Set());
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [activeResourceType, setActiveResourceType] = useState<string | null>(null);

  // Get unique resource types from account resources
  const resourceTypes = useMemo(() => {
    if (!account?.resources) return [];
    const types = new Set<string>();
    account.resources.forEach(resource => {
      // Extract the main type (last two parts of the resource type)
      const parts = resource.type.split('::');
      if (parts.length >= 2) {
        const mainType = `${parts[parts.length - 2]}::${parts[parts.length - 1]}`;
        types.add(mainType);
      }
    });
    return Array.from(types);
  }, [account?.resources]);

  // Filter resources based on the active resource type
  const activeResources = useMemo(() => {
    if (!account?.resources || !activeResourceType) return [];
    return account.resources.filter(resource => resource.type.includes(activeResourceType));
  }, [account?.resources, activeResourceType]);

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

  // Set active resource type when resourceTypes changes or from URL params
  useEffect(() => {
    if (resourceTypes.length > 0) {
      // First check if we have a resource from params
      if (resourceFromParams) {
        const matchingType = resourceTypes.find(
          type => type.toLowerCase() === resourceFromParams.toLowerCase()
        );
        if (matchingType) {
          setActiveResourceType(matchingType);
          return;
        }
      }

      // If no matching resource or no resource param, default to first type and redirect
      setActiveResourceType(resourceTypes[0]);

      // Only redirect if we're on the base account page (no resource in URL)
      if (!resourceFromParams && addressFromParams) {
        router.replace(`/account/${addressFromParams}/${resourceTypes[0].toLowerCase()}`);
      }
    }
  }, [resourceTypes, resourceFromParams, addressFromParams]);

  // Fetch account details when the component mounts or when address changes
  useEffect(() => {
    if (sdk) {
      fetchAccountDetails();
    }
  }, [addressFromParams, sdk]);

  const handleBackPress = () => {
    navigate('Home');
  };

  const formatBalance = (rawBalance: number): string => {
    // Calculate whole and fractional parts based on LIBRA_DECIMALS
    const balance = Number(rawBalance);
    const divisor = Math.pow(10, LIBRA_DECIMALS);
    const wholePart = Math.floor(balance / divisor);
    const fractionalPart = balance % divisor;

    // Format with proper decimal places
    const wholePartFormatted = wholePart.toLocaleString();

    // Convert fractional part to string with proper padding
    const fractionalStr = fractionalPart.toString().padStart(LIBRA_DECIMALS, '0');

    // Trim trailing zeros but keep at least 2 decimal places if there's a fractional part
    const trimmedFractional = fractionalPart > 0
      ? fractionalStr.replace(/0+$/, '').padEnd(2, '0')
      : '00';

    // Only show decimal part if it's non-zero
    return trimmedFractional === '00'
      ? wholePartFormatted
      : `${wholePartFormatted}.${trimmedFractional}`;
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
      // Remove 0x prefix if present for consistency with the example
      const addressToCopy = text.startsWith('0x') ? text.substring(2) : text;
      Clipboard.setString(addressToCopy);
      setCopySuccess('Address copied!');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Clipboard operation failed:', err);
    }
  };

  const handleResourceTypeChange = (resourceType: string) => {
    setActiveResourceType(resourceType);
    // Update the URL to reflect the active resource type
    router.replace(`/account/${addressFromParams}/${resourceType.toLowerCase()}`);
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
              <Text className="text-white text-sm w-2/3 text-right">{formatBalance(account.balance)} LIBRA</Text>
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
                <Text className="text-gray-500 text-sm">{activeResources.length} resources of this type</Text>
              </View>

              {/* Resource Type Navigation */}
              {resourceTypes.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row space-x-2 py-2">
                    {resourceTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => handleResourceTypeChange(type)}
                        className={`px-3 py-1.5 rounded-md ${type === activeResourceType
                          ? 'bg-primary'
                          : 'bg-gray-700'
                          }`}
                      >
                        <Text className={`text-sm font-medium ${type === activeResourceType
                          ? 'text-white'
                          : 'text-gray-300'
                          }`}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Active Resources */}
              {activeResources.length > 0 ? (
                activeResources.map((resource, index) => {
                  const isExpanded = expandedResources.has(index);
                  const isCoinResource = resource.type.includes('::coin::') || resource.type.includes('Coin');
                  const borderColor = isCoinResource ? 'border-green-600' : 'border-blue-600';

                  return (
                    <View key={index} className="bg-background rounded mb-2 overflow-hidden">
                      <TouchableOpacity
                        className={`flex-row justify-between items-center p-3 border-l-4 ${borderColor}`}
                        onPress={() => toggleResourceExpansion(index)}
                      >
                        <Text className="text-white font-bold text-sm flex-1">{resource.type}</Text>
                        <Text className="text-primary ml-2">{isExpanded ? '▼' : '▶'}</Text>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View className="p-3 border-t border-border">
                          <View className="overflow-auto">
                            <Text className="text-text-light font-mono text-xs whitespace-pre">
                              {JSON.stringify(resource.data, null, 2)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View className="py-6 bg-background rounded-lg items-center justify-center">
                  <Text className="text-white text-base">No resources found for this type</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}; 