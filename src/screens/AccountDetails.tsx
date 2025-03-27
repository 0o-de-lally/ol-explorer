import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { AccountResource } from '../types/blockchain';
import Clipboard from '@react-native-clipboard/clipboard';
import { navigate } from '../navigation/navigationUtils';
import { useLocalSearchParams, router } from 'expo-router';
import { observer } from '@legendapp/state/react';
import { useAccount } from '../hooks/useAccount';
import { ACCOUNT_DATA_CONFIG } from '../store/accountStore';

type AccountDetailsScreenProps = {
  route?: { params: { address: string; resource?: string } };
  address?: string;
};

// Coin resource type for LibraCoin
const LIBRA_COIN_RESOURCE_TYPE = "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>";
const LIBRA_DECIMALS = 8;

export const AccountDetailsScreen = observer(({ route, address: propAddress }: AccountDetailsScreenProps) => {
  const params = useLocalSearchParams();
  const addressFromParams = (route?.params?.address || propAddress || params?.address) as string;
  const resourceFromParams = (route?.params?.resource || params?.resource) as string | undefined;

  // Use our custom hook to get account data
  const { account: accountData, isLoading, error, refresh: refreshAccount, isStale } = useAccount(addressFromParams);

  const [expandedResources, setExpandedResources] = useState<Set<number>>(new Set());
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [activeResourceType, setActiveResourceType] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get unique resource types from account resources
  const resourceTypes = useMemo(() => {
    if (!accountData?.resources || !Array.isArray(accountData.resources)) return [];

    const types = new Set<string>();
    accountData.resources.forEach(resource => {
      // Extract the main type (last two parts of the resource type)
      const parts = resource.type.split('::');
      if (parts.length >= 2) {
        const mainType = `${parts[parts.length - 2]}::${parts[parts.length - 1]}`;
        types.add(mainType);
      }
    });
    return Array.from(types);
  }, [accountData?.resources]);

  // Filter resources based on the active resource type
  const activeResources = useMemo(() => {
    if (!accountData?.resources || !Array.isArray(accountData.resources) || !activeResourceType) return [];

    return accountData.resources.filter(resource => resource.type.includes(activeResourceType));
  }, [accountData?.resources, activeResourceType]);

  // Set up periodic refresh
  useEffect(() => {
    // Set up refresh interval - only if data becomes stale
    refreshTimerRef.current = setInterval(() => {
      // Only refresh if data is stale
      if (isStale) {
        console.log('Periodic account refresh triggered (data is stale)');
        refreshAccount();
      }
    }, ACCOUNT_DATA_CONFIG.REFRESH_INTERVAL_MS);

    // Cleanup function
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [refreshAccount, isStale]);

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

  const handleBackPress = () => {
    navigate('Home');
  };

  const formatBalance = (rawBalance: number | any): string => {
    // Handle observable value (check if it's an object with a get method)
    const balanceValue = typeof rawBalance === 'object' && rawBalance !== null && typeof rawBalance.get === 'function'
      ? rawBalance.get()
      : rawBalance;

    // Calculate whole and fractional parts based on LIBRA_DECIMALS
    const balance = Number(balanceValue);
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

  const handleRefresh = () => {
    // Force a refresh of the data
    refreshAccount();
  };

  if (isLoading && !accountData) {
    return (
      <View className="bg-background flex-1">
        <View className="items-center justify-center p-16">
          <ActivityIndicator size="large" color="#E75A5C" />
          <Text className="mt-4 text-white text-lg text-center">Loading account details...</Text>
        </View>
      </View>
    );
  }

  if (error && !accountData) {
    return (
      <View className="bg-background flex-1">
        <View className="items-center justify-center p-16">
          <Text className="text-primary text-2xl font-bold mb-4">Error Loading Account</Text>
          <Text className="text-white text-base text-center mb-6">{error}</Text>
          <TouchableOpacity
            className="bg-primary rounded-lg py-3 px-6 mb-4"
            onPress={handleRefresh}
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

  if (!accountData) {
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
            {isLoading && (
              <ActivityIndicator size="small" color="#E75A5C" className="ml-2" />
            )}
            <TouchableOpacity
              className="ml-3 bg-primary rounded-md px-3 py-1"
              onPress={handleRefresh}
            >
              <Text className="text-white text-sm">Refresh</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-secondary rounded-lg p-4 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-text-light text-base font-bold">Account Address</Text>
              <TouchableOpacity onPress={() => copyToClipboard(accountData.address)}>
                <Text className="text-primary text-sm">Copy</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-background rounded px-3 py-2 mb-4 relative">
              <Text className="text-text-light font-mono text-sm">{accountData.address}</Text>
              {copySuccess && (
                <View className="absolute right-2 top-2 bg-green-800/80 px-2 py-1 rounded">
                  <Text className="text-white text-xs">{copySuccess}</Text>
                </View>
              )}
            </View>

            <View className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-text-muted text-sm w-1/3">Balance</Text>
              <Text className="text-white text-sm w-2/3 text-right">{formatBalance(accountData.balance)} LIBRA</Text>
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-text-muted text-sm w-1/3">Sequence Number</Text>
              <Text className="text-white text-sm w-2/3 text-right">{accountData.sequence_number}</Text>
            </View>
          </View>

          {accountData.resources && accountData.resources.length > 0 && (
            <View className="bg-secondary rounded-lg p-4 mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-text-light text-lg font-bold">Resources ({accountData.resources.length})</Text>
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
}); 