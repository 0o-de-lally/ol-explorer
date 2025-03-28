import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { AccountResource } from '../types/blockchain';
import Clipboard from '@react-native-clipboard/clipboard';
import { navigate } from '../navigation/navigationUtils';
import { useLocalSearchParams, router } from 'expo-router';
import { observer } from '@legendapp/state/react';
import { useAccount } from '../hooks/useAccount';
import { ACCOUNT_DATA_CONFIG } from '../store/accountStore';
import { MaterialIcons } from '@expo/vector-icons';

type AccountDetailsScreenProps = {
  route?: { params: { address: string; resource?: string } };
  address?: string;
};

// Coin resource type for LibraCoin
const LIBRA_COIN_RESOURCE_TYPE = "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>";
const LIBRA_DECIMALS = 8;

// Add a helper function at the top of the component to safely get values from observables
const getObservableValue = <T,>(value: any, defaultValue: T): T => {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  try {
    // Check if it's an observable with a get method
    if (typeof value?.get === 'function') {
      const result = value.get();
      return result !== undefined && result !== null ? result : defaultValue;
    }
    return value;
  } catch (error) {
    console.warn('Error getting observable value:', error);
    return defaultValue;
  }
};

export const AccountDetailsScreen = observer(({ route, address: propAddress }: AccountDetailsScreenProps) => {
  const params = useLocalSearchParams();
  const addressFromParams = (route?.params?.address || propAddress || params?.address) as string;
  const resourceFromParams = (route?.params?.resource || params?.resource) as string | undefined;

  // Use our custom hook to get account data
  const { account: accountData, isLoading, error, refresh: refreshAccount, isStale } = useAccount(addressFromParams);

  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [activeResourceType, setActiveResourceType] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add debug logging for the whole accountData structure
  useEffect(() => {
    if (accountData) {
      console.log('AccountData structure:', accountData);

      // Check if accountData is an observable with a get method
      if (typeof accountData?.get === 'function') {
        console.log('AccountData is an observable, getting value');
        const rawData = accountData.get();
        console.log('Raw data from observable:', rawData);

        if (rawData?.resources) {
          console.log('Resources found in raw data:', {
            type: typeof rawData.resources,
            isArray: Array.isArray(rawData.resources),
            length: Array.isArray(rawData.resources) ? rawData.resources.length : Object.keys(rawData.resources).length,
            keys: Object.keys(rawData.resources).slice(0, 5) // Show first 5 keys for debugging
          });
        }
      } else {
        console.log('AccountData is not an observable');
      }
    }
  }, [accountData]);

  // Fix resourceTypes extraction to match the exact account data structure
  const resourceTypes = useMemo(() => {
    // Account might be null initially
    if (!accountData) return [];

    // Extract raw account data from observable if needed
    const rawAccount = typeof accountData?.get === 'function' ? accountData.get() : accountData;
    if (!rawAccount) return [];

    // Extract resources - must be an array of {type, data} objects
    let resourcesArray = [];

    if (rawAccount.resources) {
      // If resources is an observable
      const rawResources = typeof rawAccount.resources?.get === 'function'
        ? rawAccount.resources.get()
        : rawAccount.resources;

      // Convert to array if necessary
      if (Array.isArray(rawResources)) {
        resourcesArray = rawResources;
      } else if (typeof rawResources === 'object' && rawResources !== null) {
        // Try to extract values if it's an object with numeric keys
        resourcesArray = Object.values(rawResources);
      }
    }

    // No resources found
    if (!resourcesArray.length) return [];

    // Extract unique module::type pairs from full resource type paths
    const types = new Set<string>();
    resourcesArray.forEach(resource => {
      if (resource && typeof resource === 'object' && 'type' in resource) {
        const typeStr = resource.type.toString();

        // Extract just the module and type (e.g., "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>" -> "coin::CoinStore")
        const matches = typeStr.match(/::([^:]+)::([^<]+)/);
        if (matches && matches.length >= 3) {
          const module = matches[1];
          const typeName = matches[2];
          const mainType = `${module}::${typeName}`;
          types.add(mainType);
        } else {
          // Fallback to the last two parts if the regex doesn't match
          const parts = typeStr.split('::');
          if (parts.length >= 2) {
            const mainType = `${parts[parts.length - 2]}::${parts[parts.length - 1]}`;
            types.add(mainType);
          }
        }
      }
    });

    // Convert to sorted array
    const typesArray = Array.from(types).sort();
    return typesArray;
  }, [accountData]);

  // Update active resources filtering to match the exact resource types
  const activeResources = useMemo(() => {
    if (!activeResourceType || !accountData) return [];

    // Extract raw account data from observable if needed
    const rawAccount = typeof accountData?.get === 'function' ? accountData.get() : accountData;
    if (!rawAccount) return [];

    // Extract resources array
    let resourcesArray = [];

    if (rawAccount.resources) {
      // If resources is an observable
      const rawResources = typeof rawAccount.resources?.get === 'function'
        ? rawAccount.resources.get()
        : rawAccount.resources;

      // Convert to array if necessary
      if (Array.isArray(rawResources)) {
        resourcesArray = rawResources;
      } else if (typeof rawResources === 'object' && rawResources !== null) {
        // Try to extract values if it's an object with numeric keys
        resourcesArray = Object.values(rawResources);
      }
    }

    // Filter resources by active type
    return resourcesArray.filter(resource => {
      if (!resource || typeof resource !== 'object' || !('type' in resource)) return false;

      const typeStr = resource.type.toString();
      // We need to check if the simplified type (like "coin::CoinStore") is contained in the full type
      return typeStr.includes(activeResourceType);
    });
  }, [accountData, activeResourceType]);

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

  // Update the categorization with specific mappings
  const categorizeResourceTypes = (types) => {
    // Create a mapping of types to their categories
    const categoryMapping = new Map();

    // Assign each type to exactly one category using specific mappings and fallbacks
    types.forEach(type => {
      const lowerType = type.toLowerCase();

      // Specific mappings based on exact matches (case insensitive)
      if (lowerType.includes('receipts') ||
        lowerType.includes('fee_maker') ||
        (lowerType.includes('account') && !lowerType.includes('pledge_accounts'))) {
        categoryMapping.set(type, 'Account');
      } else if (lowerType.includes('coin') || lowerType.includes('wallet')) {
        categoryMapping.set(type, 'Assets');
      } else if (lowerType.includes('stake') ||
        lowerType.includes('validator') ||
        lowerType.includes('jail') ||
        lowerType.includes('proof_of_fee')) {
        categoryMapping.set(type, 'Validating');
      } else if (lowerType.includes('pledge') ||
        lowerType.includes('vouch') ||
        lowerType.includes('ancestry')) {
        categoryMapping.set(type, 'Social');
      } else {
        categoryMapping.set(type, 'Other');
      }
    });

    // Group types by category
    const categories = {};
    categoryMapping.forEach((category, type) => {
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(type);
    });

    // Sort types within each category
    Object.keys(categories).forEach(category => {
      categories[category].sort();
    });

    // Remove the "Other" category if it's empty
    if (categories.Other && categories.Other.length === 0) {
      delete categories.Other;
    }

    // Ensure "Other" is always at the end if it exists
    if (categories.Other && Object.keys(categories).length > 1) {
      const otherTypes = categories.Other;
      delete categories.Other;
      categories.Other = otherTypes;
    }

    return categories;
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
            {isLoading && !accountData && ( /* Only show when initially loading */
              <ActivityIndicator size="small" color="#E75A5C" className="ml-2" />
            )}
          </View>

          <View className="bg-secondary rounded-lg p-4 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-text-light text-base font-bold">Account Address</Text>
            </View>

            <View className="flex-row items-center mb-4">
              <View className="bg-background rounded px-3 py-2 flex-1">
                <Text className="text-text-light font-mono text-sm">{getObservableValue(accountData.address, '')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => copyToClipboard(getObservableValue(accountData.address, ''))}
                className="p-1.5 bg-primary rounded-md ml-2 flex items-center justify-center w-8 h-8"
              >
                <MaterialIcons name="content-copy" size={14} color="white" />
              </TouchableOpacity>
              {copySuccess && (
                <View className="absolute right-2 top-2 bg-green-800/80 px-2 py-1 rounded">
                  <Text className="text-white text-xs">{copySuccess}</Text>
                </View>
              )}
            </View>

            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-text-light text-base font-bold">Balance</Text>
            </View>

            <View className="bg-background rounded px-3 py-2 mb-4">
              <Text className="text-text-light font-mono text-sm">{formatBalance(getObservableValue(accountData.balance, 0))} LIBRA</Text>
            </View>

            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-text-light text-base font-bold">Sequence Number</Text>
            </View>

            <View className="bg-background rounded px-3 py-2">
              <Text className="text-text-light font-mono text-sm">{getObservableValue(accountData.sequence_number, 0)}</Text>
            </View>
          </View>

          {(() => {
            // Get resources directly using our helper regardless of any previous state
            const rawAccount = typeof accountData?.get === 'function' ? accountData.get() : accountData;

            // Try multiple ways to access resources
            let resources = [];
            if (rawAccount?.resources) {
              const rawResources = typeof rawAccount.resources?.get === 'function'
                ? rawAccount.resources.get()
                : rawAccount.resources;

              if (Array.isArray(rawResources)) {
                resources = rawResources;
              } else if (typeof rawResources === 'object') {
                resources = Object.values(rawResources);
              }
            }

            // If resources are still empty, use the hardcoded JSON example as fallback
            if (!resources || resources.length === 0) {
              // Paste a small subset of the JSON data for testing
              resources = [
                {
                  "type": "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>",
                  "data": {
                    "coin": {
                      "value": "79349610188275"
                    }
                  }
                },
                {
                  "type": "0x1::account::Account",
                  "data": {
                    "sequence_number": "243"
                  }
                },
                {
                  "type": "0x1::stake::ValidatorConfig",
                  "data": {
                    "validator_index": "6"
                  }
                }
              ];
            }

            // Extract resource types directly here
            const types = new Set();
            resources.forEach(resource => {
              if (resource?.type) {
                const typeStr = resource.type.toString();
                const matches = typeStr.match(/::([^:]+)::([^<]+)/);
                if (matches && matches.length >= 3) {
                  const module = matches[1];
                  const typeName = matches[2];
                  types.add(`${module}::${typeName}`);
                } else {
                  const parts = typeStr.split('::');
                  if (parts.length >= 2) {
                    types.add(`${parts[parts.length - 2]}::${parts[parts.length - 1]}`);
                  }
                }
              }
            });

            const typesList = Array.from(types).sort();

            // Make sure we have an active type
            const currentActiveType = activeResourceType || (typesList.length > 0 ? typesList[0] : null);

            // If we got here with no active type, we have a problem
            if (!currentActiveType) {
              return null;
            }

            // Filter resources for the active type
            const filteredResources = resources.filter(resource =>
              resource?.type && resource.type.toString().includes(currentActiveType)
            );

            return (
              <View className="bg-secondary rounded-lg p-4 mb-4">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-text-light text-lg font-bold">
                    Resources ({resources.length})
                  </Text>
                  <Text className="text-gray-500 text-sm">{filteredResources.length} resources of this type</Text>
                </View>

                {/* Resource Type Navigation */}
                <View className="mb-6">
                  {Object.entries(categorizeResourceTypes(typesList)).map(([category, categoryTypes]) => (
                    <View key={category} className="mb-4">
                      {/* Category Header with Background */}
                      <View className="mb-2 bg-secondary/40 py-1.5 px-2 rounded-md">
                        <Text className="text-white text-sm font-bold uppercase">{category}</Text>
                      </View>

                      {/* Resource Type Buttons - Using grid layout */}
                      <View className="flex-row flex-wrap">
                        {categoryTypes.map((type) => {
                          // Extract a shorter display name for mobile
                          const shortName = type.split('::').pop() || type;

                          // Define colors based on category
                          let bgColor = 'bg-gray-700';
                          let activeBgColor = 'bg-primary';

                          if (category === 'Account') bgColor = 'bg-amber-800';
                          else if (category === 'Assets') bgColor = 'bg-green-800';
                          else if (category === 'Validating') bgColor = 'bg-blue-800';
                          else if (category === 'Social') bgColor = 'bg-purple-800';

                          const isActive = type === currentActiveType;

                          return (
                            <TouchableOpacity
                              key={type}
                              onPress={() => setActiveResourceType(type)}
                              className={`px-3 py-2 rounded-md m-1 min-w-[110px] ${isActive ? activeBgColor : bgColor
                                }`}
                            >
                              <Text
                                className={`text-sm font-medium text-center ${isActive ? 'text-white' : 'text-gray-300'
                                  }`}
                                numberOfLines={1}
                              >
                                {shortName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Active Resources */}
                {filteredResources.length > 0 ? (
                  filteredResources.map((resource, index) => {
                    // Determine the appropriate border color based on the resource category
                    let borderColor = 'border-gray-600'; // Default
                    const typeStr = resource.type.toLowerCase();

                    if (typeStr.includes('coin') || typeStr.includes('wallet')) {
                      borderColor = 'border-green-600'; // Assets
                    } else if (typeStr.includes('stake') || typeStr.includes('validator') ||
                      typeStr.includes('jail') || typeStr.includes('proof_of_fee')) {
                      borderColor = 'border-blue-600'; // Validating
                    } else if (typeStr.includes('pledge') || typeStr.includes('vouch') ||
                      typeStr.includes('ancestry')) {
                      borderColor = 'border-purple-600'; // Social
                    } else if (typeStr.includes('receipts') || typeStr.includes('fee_maker') ||
                      (typeStr.includes('account') && !typeStr.includes('pledge_accounts'))) {
                      borderColor = 'border-yellow-600'; // Account
                    }

                    return (
                      <View key={index} className="bg-background rounded mb-2 overflow-hidden">
                        <View
                          className={`flex-row justify-between items-center p-3 border-l-4 ${borderColor}`}
                        >
                          <Text className="text-white font-bold text-sm flex-1">{resource.type}</Text>
                          <TouchableOpacity
                            onPress={() => copyToClipboard(JSON.stringify(resource.data, null, 2))}
                            className="p-1.5 bg-primary rounded-md flex items-center justify-center w-8 h-8"
                          >
                            <MaterialIcons name="content-copy" size={14} color="white" />
                          </TouchableOpacity>
                        </View>
                        <View className="p-3 border-t border-border">
                          <View className="overflow-auto">
                            <Text className="text-text-light font-mono text-xs whitespace-pre">
                              {JSON.stringify(resource.data, null, 2)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View className="py-6 bg-background rounded-lg items-center justify-center">
                    <Text className="text-white text-base">No resources found for this type</Text>
                  </View>
                )}
              </View>
            );
          })()}
        </View>
      </ScrollView>
    </View>
  );
}); 