import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, AppState, AppStateStatus, ScrollViewProps, NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions } from 'react-native';
import { AccountResource } from '../types/blockchain';
import Clipboard from '@react-native-clipboard/clipboard';
import { navigate } from '../navigation/navigationUtils';
import { useLocalSearchParams, router } from 'expo-router';
import { observer } from '@legendapp/state/react';
import { useAccount } from '../hooks/useAccount';
import { ACCOUNT_DATA_CONFIG } from '../store/accountStore';
import { MaterialIcons } from '@expo/vector-icons';
import { AccountTransactionsList } from '../components/AccountTransactionsList';
import appConfig from '../config/appConfig';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ExtendedAccountData } from '../store/accountStore';
import { Container, Row, Column, Card, TwoColumn } from '../components';

type AccountDetailsScreenProps = {
  route?: { params: { address: string; resource?: string } };
  address?: string;
};

// Coin resource type for LibraCoin
const LIBRA_COIN_RESOURCE_TYPE = "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>";
const LIBRA_DECIMALS = 6;

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

// Helper function to convert camelCase to Space Case for display
const formatDisplayName = (typeName: string): string => {
  // First handle special cases like "ValidatorConfig"
  if (!typeName) return '';

  // Split by :: to get the last part (e.g., "stake::ValidatorConfig" → "ValidatorConfig")
  const parts = typeName.split('::');
  const lastPart = parts[parts.length - 1];

  // Convert camelCase or PascalCase to space-separated words
  // Insert space before capital letters and uppercase the first letter of each word
  return lastPart
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Uppercase first letter
    .trim(); // Remove any leading/trailing spaces
};

// Helper function to convert camelCase to kebab-case for URL slugs
const formatUrlSlug = (typeName: string): string => {
  if (!typeName) return '';

  // Split by :: to get the last part
  const parts = typeName.split('::');
  const lastPart = parts[parts.length - 1];

  // Convert camelCase or PascalCase to kebab-case
  return lastPart
    .replace(/([A-Z])/g, '-$1') // Add hyphen before capital letters
    .toLowerCase() // Convert to lowercase
    .replace(/^-/, '') // Remove leading hyphen if present
    .trim(); // Remove any leading/trailing spaces
};

// Helper function to extract simplified resource type for URL paths - completely revised
const getSimplifiedType = (fullType: string) => {
  if (!fullType) return '';

  // Extract the module and type name from the full type
  const parts = fullType.split('::');
  if (parts.length < 2) return formatUrlSlug(fullType);

  // For standard types, use module-type format
  const module = parts[parts.length - 2].toLowerCase();
  const typeName = parts[parts.length - 1];

  // Create a consistent slug pattern that uniquely identifies this resource type
  return `${module}-${formatUrlSlug(typeName)}`;
};

// Helper function to convert resource type to URL slug - deterministic mapping
const resourceTypeToSlug = (type: string): string => {
  if (!type) return '';

  // Extract the module and type parts
  const parts = type.split('::');
  if (parts.length < 2) return '';

  const module = parts[parts.length - 2].toLowerCase();
  const typeName = parts[parts.length - 1];

  // Create kebab-case from typeName
  const typeNameKebab = typeName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');

  return `${module}-${typeNameKebab}`;
};

// Helper function to find resource type from slug - deterministic inverse mapping
const slugToResourceType = (types: string[], slug: string): string | null => {
  if (!slug || !types || types.length === 0) return null;

  console.log(`Attempting to match slug: '${slug}' to available resource types`);

  // Special case for repeated segments like "ancestry-ancestry"
  if (slug.includes('-')) {
    const segments = slug.split('-');
    // Check if there's a repeated segment (like ancestry-ancestry)
    const uniqueSegments = Array.from(new Set(segments));
    if (uniqueSegments.length < segments.length) {
      // We have repeated segments - handle specially
      console.log(`Detected repeated segments in slug: ${slug}`);

      // Try to find a resource type that contains the unique segment(s)
      for (const segment of uniqueSegments) {
        const matchingType = types.find(type =>
          type.toLowerCase().includes(segment.toLowerCase())
        );
        if (matchingType) {
          console.log(`✓ Found match for repeated segment '${segment}': ${matchingType}`);
          return matchingType;
        }
      }
    }
  }

  // First try: exact match on module-type pattern
  for (const type of types) {
    const typeSlug = resourceTypeToSlug(type);
    console.log(`Comparing: type='${type}', generated slug='${typeSlug}', requested='${slug}'`);
    if (typeSlug === slug) {
      console.log(`✓ Found exact slug match: ${type}`);
      return type;
    }
  }

  // Legacy mappings - handle special URL segments for backward compatibility
  if (slug === 'my-pledges') {
    // Find pledge-related resources
    return types.find(type =>
      type.toLowerCase().includes('pledge') ||
      type.toLowerCase().includes('vouch')
    ) || null;
  }

  if (slug === 'fee-maker') {
    // Find fee maker resources
    return types.find(type =>
      type.toLowerCase().includes('fee') &&
      type.toLowerCase().includes('maker')
    ) || null;
  }

  // Try keyword matching as fallback
  const keywords = slug.split('-');
  const matchingType = types.find(type =>
    keywords.every(kw => type.toLowerCase().includes(kw))
  );

  if (matchingType) {
    console.log(`✓ Found keyword match: ${matchingType}`);
    return matchingType;
  }

  // Final fallback: partial matching on any segment
  for (const type of types) {
    if (type.toLowerCase().includes(slug) ||
      slug.includes(type.toLowerCase())) {
      console.log(`✓ Found partial match: ${type}`);
      return type;
    }
  }

  console.log(`✗ No match found for slug: ${slug}`);
  return null;
};

// Add auto-refresh interval constant to match TransactionsList
const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds for auto-refresh

// Fix instances where resources.get() is used to extract raw resources
// This function properly extracts resources in multiple ways
const extractResources = (accountData: any): any[] => {
  if (!accountData) return [];

  if (!accountData.resources) return [];

  // If resources is an array, return it directly
  if (Array.isArray(accountData.resources)) {
    return accountData.resources;
  }

  // If resources is an object, convert to array
  if (typeof accountData.resources === 'object' && accountData.resources !== null) {
    return Object.values(accountData.resources);
  }

  return [];
};

// Modify the formatTimestamp function to handle Unix timestamps in seconds
const formatTimestamp = (timestamp: number | string | any[]): string => {
  if (!timestamp) return 'N/A';

  // Handle array format like ['1743775134']
  if (Array.isArray(timestamp) && timestamp.length > 0) {
    timestamp = timestamp[0];
  }

  // Convert string to number if needed
  if (typeof timestamp === 'string') {
    timestamp = parseInt(timestamp, 10);
  }

  // If still not a valid number after conversions, return N/A
  if (isNaN(timestamp as number)) {
    return 'N/A';
  }

  // The value is in seconds since epoch (not milliseconds or microseconds)
  // We need to multiply by 1000 to convert to milliseconds for JavaScript Date
  const milliseconds = (timestamp as number) * 1000;

  const date = new Date(milliseconds);

  // Format with locale for readability
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const AccountDetailsScreen = observer(({ route, address: propAddress }: AccountDetailsScreenProps) => {
  const params = useLocalSearchParams();
  const addressFromParams = (route?.params?.address || propAddress || params?.address) as string;

  // Get the resource parameter from URL, ensuring consistency
  const resourceParam = route?.params?.resource || params?.resource as string | undefined;

  // Use our custom hook to get account data
  const { account: accountData, extendedData, isLoading, error, refresh: refreshAccount, isStale } = useAccount(addressFromParams);

  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [activeResourceType, setActiveResourceType] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const appState = useRef(AppState.currentState);
  const { width } = useWindowDimensions();

  // Data loaded tracking
  const dataLoadedRef = useRef(false);
  // Track if component is mounted
  const isMounted = useRef(true);

  // Try to use navigation focus hook for determining if screen is visible
  let isFocused = true;
  try {
    isFocused = useIsFocused();
  } catch (e) {
    // If hook is not available, default to true
    console.log('Navigation focus hook not available, defaulting to visible');
    isFocused = true;
  }

  // Debug log the parameters
  useEffect(() => {
    console.log('AccountDetailsScreen mounted with params:', {
      addressFromParams,
      resourceParam,
      hasAccountData: !!accountData
    });

    // Reset auto-refreshing state on mount
    setIsAutoRefreshing(false);
  }, []);

  // Extract resource types from account data
  const resourceTypes = useMemo(() => {
    console.log('Extracting resource types, accountData present:', !!accountData);

    // Reset data loaded flag when data changes
    dataLoadedRef.current = false;

    if (!accountData) return [];

    // Extract raw account data
    const rawAccount = accountData;
    if (!rawAccount) return [];

    // Extract resources array
    let resourcesArray = [];
    if (rawAccount.resources) {
      resourcesArray = extractResources(rawAccount);
    }

    if (!resourcesArray.length) {
      console.log('No resources found in account data');
      return [];
    }

    // Track pledge-related resources for debugging
    const pledgeResources = resourcesArray.filter(resource => {
      if (resource && typeof resource === 'object' && 'type' in resource) {
        const typeStr = resource.type.toString().toLowerCase();
        return typeStr.includes('pledge') || typeStr.includes('vouch');
      }
      return false;
    });

    if (pledgeResources.length > 0) {
      console.log('Found pledge-related resources:',
        pledgeResources.map(r => r.type));
    }

    // Extract unique resource types
    const types = new Set<string>();
    resourcesArray.forEach(resource => {
      if (resource && typeof resource === 'object' && 'type' in resource) {
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

    const typesArray = Array.from(types).sort();

    // Mark data as loaded
    dataLoadedRef.current = true;
    console.log('Resource types extracted:', typesArray.length, 'types');

    // Map types to slugs for debugging
    typesArray.forEach(type => {
      console.log(`Type: ${type} → Slug: ${resourceTypeToSlug(type)}`);
    });

    return typesArray;
  }, [accountData]);

  // Set active resource type based on URL parameter or default
  useEffect(() => {
    if (!dataLoadedRef.current || resourceTypes.length === 0) {
      console.log('Waiting for data to load before selecting resource type');
      return;
    }

    console.log('Data loaded, selecting resource type from param:', resourceParam);
    console.log('Available resource types:', resourceTypes.map(t =>
      `${t} → ${resourceTypeToSlug(t)}`
    ).join(', '));

    if (resourceParam) {
      // Try to find matching resource type
      const matchingType = slugToResourceType(resourceTypes, resourceParam);

      if (matchingType) {
        console.log(`Found matching resource type: ${matchingType} for URL param: ${resourceParam}`);
        console.log(`Setting active resource type to: ${matchingType}`);
        setActiveResourceType(matchingType);
      } else {
        console.log(`No matching resource type found for URL param: ${resourceParam}, using default`);
        console.log(`Setting active resource type to: ${resourceTypes[0]}`);
        setActiveResourceType(resourceTypes[0]);
      }
    } else {
      // No resource parameter, use first available type
      console.log('No resource parameter, using first type:', resourceTypes[0]);
      console.log(`Setting active resource type to: ${resourceTypes[0]}`);
      setActiveResourceType(resourceTypes[0]);
    }
  }, [resourceTypes, resourceParam, dataLoadedRef.current]);

  // Refs for scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Set isMounted ref on mount/unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      console.log('App has come to the foreground, refreshing account details');
      if (isFocused && addressFromParams) {
        setIsAutoRefreshing(true);
        refreshAccount()
          .then(() => console.log('Foreground refresh completed'))
          .catch(err => console.error('Foreground refresh error:', err))
          .finally(() => {
            if (isMounted.current) {
              setTimeout(() => setIsAutoRefreshing(false), 500);
            }
          });
      }
    }
    appState.current = nextAppState;
  };

  // Set up and clean up polling based on visibility
  useEffect(() => {
    if (isFocused && addressFromParams) {
      startPolling();
    } else {
      stopPolling();
    }

    // Clean up polling on unmount
    return () => {
      stopPolling();
    };
  }, [isFocused, addressFromParams]);

  // Start polling interval
  const startPolling = () => {
    // Only start polling if not already polling and we have the necessary data
    if (!refreshTimerRef.current && isFocused && addressFromParams) {
      console.log('Starting polling for account details');

      // Reset any lingering auto-refresh state
      setIsAutoRefreshing(false);

      // Force an immediate refresh when starting polling
      setTimeout(() => {
        console.log('Initial account details refresh');
        if (isMounted.current && isFocused) {
          setIsAutoRefreshing(true);
          refreshAccount()
            .then(() => console.log('Initial account refresh completed'))
            .catch(err => console.error('Initial account refresh error:', err))
            .finally(() => {
              if (isMounted.current) {
                setTimeout(() => setIsAutoRefreshing(false), 500);
              }
            });
        }
      }, 200);

      refreshTimerRef.current = setInterval(() => {
        // Only refresh if we're not already refreshing and component is still visible
        if (!isAutoRefreshing && isFocused && isMounted.current) {
          console.log('[POLL] Auto-refreshing account details - starting refresh');
          setIsAutoRefreshing(true);
          refreshAccount()
            .then(() => console.log('[POLL] Account refresh completed'))
            .catch(err => console.error('[POLL] Account refresh error:', err))
            .finally(() => {
              if (isMounted.current) {
                setTimeout(() => {
                  setIsAutoRefreshing(false);
                  console.log('[POLL] Account refresh state reset');
                }, 500);
              }
            });
        } else {
          console.log('[POLL] Skipping account refresh, conditions not met:', {
            isAutoRefreshing, isFocused, isMounted: isMounted.current
          });
        }
      }, AUTO_REFRESH_INTERVAL);

      console.log(`Auto-refresh interval set to ${AUTO_REFRESH_INTERVAL}ms`);
    }
  };

  // Stop polling interval
  const stopPolling = () => {
    if (refreshTimerRef.current) {
      console.log('Stopping polling for account details');
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;

      // Ensure the auto-refresh state is reset when stopping polling
      setIsAutoRefreshing(false);
    }
  };

  // Update active resources filtering to match the exact resource types
  const activeResources = useMemo(() => {
    if (!activeResourceType || !accountData) return [];

    // Extract raw account data
    const rawAccount = accountData;
    if (!rawAccount) return [];

    // Extract resources array
    let resourcesArray = [];
    if (rawAccount.resources) {
      resourcesArray = extractResources(rawAccount);
    }

    // Filter resources by active type
    return resourcesArray.filter(resource => {
      if (!resource || typeof resource !== 'object' || !('type' in resource)) return false;

      const typeStr = resource.type.toString();
      // Check if the simplified type is contained in the full type
      return typeStr.includes(activeResourceType);
    });
  }, [accountData, activeResourceType]);

  // Handle resource type selection - only update state without URL changes
  const handleResourceTypeChange = (resourceType: string) => {
    console.log(`Changing resource type to: ${resourceType}`);

    // Simply update the state without changing the URL
    setActiveResourceType(resourceType);

    // No router navigation - preventing scroll reset
  };

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

  // Update the categorization with specific mappings and proper typing
  const categorizeResourceTypes = (types: string[]): Record<string, string[]> => {
    // Create a mapping of types to their categories
    const categoryMapping = new Map<string, string>();

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
        lowerType.includes('ancestry') ||
        lowerType.includes('pledge_accounts')) {
        // Ensure all pledge and vouch related resources are categorized as Social
        categoryMapping.set(type, 'Social');
        console.log(`Categorized as Social: ${type}`);
      } else {
        categoryMapping.set(type, 'Other');
      }
    });

    // Group types by category
    const categories: Record<string, string[]> = {};
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
    if (categories['Other'] && categories['Other'].length === 0) {
      delete categories['Other'];
    }

    // Ensure "Other" is always at the end if it exists
    if (categories['Other'] && Object.keys(categories).length > 1) {
      const otherTypes = categories['Other'];
      delete categories['Other'];
      categories['Other'] = otherTypes;
    }

    return categories;
  };

  // Update the refresh button logic to handle loading states properly
  const handleRefresh = async () => {
    console.log('Manual refresh triggered');
    setIsAutoRefreshing(true);
    refreshAccount()
      .then(() => console.log('Manual refresh completed successfully'))
      .catch(err => console.error('Error during manual refresh:', err))
      .finally(() => {
        if (isMounted.current) {
          setTimeout(() => setIsAutoRefreshing(false), 500);
        }
      });
  };

  if (isLoading && !accountData) {
    return (
      <View className="bg-background flex-1">
        <Container>
          <View className="items-center justify-center p-16">
            <ActivityIndicator size="large" color="#E75A5C" />
            <Text className="mt-4 text-white text-lg text-center">Loading account details...</Text>
          </View>
        </Container>
      </View>
    );
  }

  if (error && !accountData) {
    return (
      <View className="bg-background flex-1">
        <Container>
          <Column alignItems="center" justifyContent="center" className="p-16">
            <Text className="text-primary text-2xl font-bold mb-4">Error Loading Account</Text>
            <Text className="text-white text-base text-center mb-6">{error}</Text>
            <TouchableOpacity
              className="bg-primary rounded-lg py-3 px-6 mb-4"
              onPress={() => {
                console.log('Debug refresh triggered');
                setIsAutoRefreshing(true);
                refreshAccount()
                  .then(() => console.log('Debug refresh completed'))
                  .catch(err => console.error('Debug refresh error:', err))
                  .finally(() => {
                    setTimeout(() => setIsAutoRefreshing(false), 500);
                  });
              }}
            >
              <Text className="text-white font-bold text-base">Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity className="mt-2" onPress={handleBackPress}>
              <Text className="text-primary text-base font-bold">← Back</Text>
            </TouchableOpacity>
          </Column>
        </Container>
      </View>
    );
  }

  if (!accountData) {
    return (
      <View className="bg-background flex-1">
        <Container>
          <Column alignItems="center" justifyContent="center" className="p-16">
            <Text className="text-primary text-2xl font-bold mb-4">Account Not Found</Text>
            <TouchableOpacity className="mt-2" onPress={handleBackPress}>
              <Text className="text-primary text-base font-bold">← Back</Text>
            </TouchableOpacity>
          </Column>
        </Container>
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <ScrollView
        ref={scrollViewRef}
        scrollEventThrottle={16}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = event.nativeEvent.contentOffset.y;
          setScrollPosition(y);
        }}
      >
        <Container>
          <Row alignItems="center" className="mb-5 flex-wrap">
            <TouchableOpacity
              className="mr-4 mb-2"
              onPress={handleBackPress}
            >
              <Text className="text-primary text-base font-bold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold flex-1 flex-wrap">
              Account Details
            </Text>
          </Row>

          <Card className="mb-4">
            {/* Account Address section */}
            <Row justifyContent="between" alignItems="center" className="mb-3">
              <Text className="text-text-light text-base font-bold">Account Address</Text>
              <View className="w-8 h-8 justify-center items-center">
                {(isLoading && !accountData) ? (
                  <ActivityIndicator size="small" color="#E75A5C" />
                ) : (isAutoRefreshing) ? (
                  <ActivityIndicator size="small" color="#E75A5C" />
                ) : (
                  <TouchableOpacity
                    onPress={handleRefresh}
                    className="p-2"
                  >
                    <Text className="text-primary">Refresh</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Row>

            <Row alignItems="center" className="mb-4">
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
            </Row>

            {/* Main content with responsive layout */}
            <TwoColumn
              leftWidth="w-full md:w-1/2"
              rightWidth="w-full md:w-1/2"
              spacing="space-y-4 md:space-y-0 md:space-x-8"
              stackOnMobile={true}
            >
              {/* Left Column - Basic Account Info */}
              <Column>
                <Row justifyContent="between" alignItems="center" className="mb-3">
                  <Text className="text-text-light text-base font-bold">Balance</Text>
                </Row>

                <View className="bg-background rounded px-3 py-2 mb-4">
                  <Text className="text-text-light font-mono text-sm">{formatBalance(getObservableValue(accountData.balance, 0))} LIBRA</Text>
                </View>

                <Row justifyContent="between" alignItems="center" className="mb-3">
                  <Text className="text-text-light text-base font-bold">Unlocked Balance</Text>
                </Row>

                <View className="bg-background rounded px-3 py-2 mb-4">
                  <Text className="text-text-light font-mono text-sm">
                    {(() => {
                      // Get resources directly using our helper
                      const rawAccount = accountData;
                      if (!rawAccount?.resources) return '0';

                      // Extract resources array
                      let resourcesArray = [];
                      if (rawAccount.resources) {
                        resourcesArray = extractResources(rawAccount);
                      }

                      // Find SlowWallet resource
                      const slowWallet = resourcesArray.find(resource =>
                        resource?.type === '0x1::slow_wallet::SlowWallet'
                      );

                      if (slowWallet?.data?.unlocked) {
                        // Calculate whole and fractional parts based on LIBRA_DECIMALS
                        const balance = Number(slowWallet.data.unlocked);
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
                        const formattedBalance = trimmedFractional === '00'
                          ? wholePartFormatted
                          : `${wholePartFormatted}.${trimmedFractional}`;

                        return `${formattedBalance} LIBRA`;
                      }
                      return '0 LIBRA';
                    })()}
                  </Text>
                </View>

                <Row justifyContent="between" alignItems="center" className="mb-1">
                  <Text className="text-text-light text-base font-bold">Sequence Number</Text>
                </Row>

                <View className="bg-background rounded px-3 py-2">
                  <Text className="text-text-light font-mono text-sm">{getObservableValue(accountData.sequence_number, 0)}</Text>
                </View>
              </Column>

              {/* Right Column - Status Information */}
              <Column>
                {/* Always show statuses even if null, just hide the details when not applicable */}
                <View>
                  {/* 1. Activity Status Section */}
                  <Row justifyContent="between" alignItems="center" className="mb-3">
                    <Text className="text-text-light text-base font-bold">Activity Status</Text>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#E75A5C" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Refreshing activity status');
                          refreshAccount();
                        }}
                        className="p-1.5 bg-primary rounded-md flex items-center justify-center w-8 h-8"
                      >
                        <MaterialIcons name="refresh" size={14} color="white" />
                      </TouchableOpacity>
                    )}
                  </Row>

                  <View className="bg-background rounded px-3 py-3 mb-4">
                    {getObservableValue(extendedData?.activity?.hasBeenTouched, false) ? (
                      <>
                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Account Touched:</Text>
                          <View className="bg-green-800 px-2 py-0.5 rounded-md">
                            <Text className="text-white text-xs">Yes</Text>
                          </View>
                        </Row>

                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Initialized on V8:</Text>
                          {getObservableValue(extendedData?.activity?.isInitializedOnV8, false) ? (
                            <View className="bg-green-800 px-2 py-0.5 rounded-md">
                              <Text className="text-white text-xs">Yes</Text>
                            </View>
                          ) : (
                            <View className="bg-gray-700 px-2 py-0.5 rounded-md">
                              <Text className="text-gray-300 text-xs">No</Text>
                            </View>
                          )}
                          <View className="ml-2">
                            <TouchableOpacity
                              onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent("0x1::activity::is_initialized")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                              }}
                              className="rounded-md px-2 py-0.5 bg-blue-800"
                            >
                              <Text className="text-white text-xs">View</Text>
                            </TouchableOpacity>
                          </View>
                        </Row>

                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Onboarded:</Text>
                          <Text className="text-white text-sm">
                            {formatTimestamp(getObservableValue(extendedData?.activity?.onboardingTimestamp, 0))}
                          </Text>
                        </Row>

                        <Row alignItems="center">
                          <Text className="text-text-light text-sm mr-2">Last Activity:</Text>
                          <Text className="text-white text-sm">
                            {formatTimestamp(getObservableValue(extendedData?.activity?.lastActivityTimestamp, 0))}
                          </Text>
                        </Row>
                      </>
                    ) : (
                      <Row alignItems="center">
                        <Text className="text-text-light text-sm mr-2">Account Touched:</Text>
                        <View className="bg-gray-700 px-2 py-0.5 rounded-md">
                          <Text className="text-gray-300 text-xs">No</Text>
                        </View>
                        <View className="ml-2">
                          <TouchableOpacity
                            onPress={() => {
                              router.push(`/view?initialPath=${encodeURIComponent("0x1::activity::has_ever_been_touched")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                            }}
                            className="rounded-md px-2 py-0.5 bg-blue-800"
                          >
                            <Text className="text-white text-xs">View</Text>
                          </TouchableOpacity>
                        </View>
                      </Row>
                    )}
                  </View>

                  {/* 2. Founder Status Section */}
                  <Row justifyContent="between" alignItems="center" className="mb-3">
                    <Text className="text-text-light text-base font-bold">Founder Status</Text>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#E75A5C" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Refreshing founder status');
                          refreshAccount();
                        }}
                        className="p-1.5 bg-primary rounded-md flex items-center justify-center w-8 h-8"
                      >
                        <MaterialIcons name="refresh" size={14} color="white" />
                      </TouchableOpacity>
                    )}
                  </Row>
                  <View className="bg-background rounded px-3 py-3 mb-4">
                    <Row alignItems="center" className="mb-2">
                      <Text className="text-text-light text-sm mr-2">Founder:</Text>
                      {getObservableValue(extendedData?.founder?.isFounder, false) ? (
                        <View className="bg-green-800 px-2 py-0.5 rounded-md">
                          <Text className="text-white text-xs">Yes</Text>
                        </View>
                      ) : (
                        <View className="bg-gray-700 px-2 py-0.5 rounded-md">
                          <Text className="text-gray-300 text-xs">No</Text>
                        </View>
                      )}
                      <View className="ml-2">
                        <TouchableOpacity
                          onPress={() => {
                            router.push(`/view?initialPath=${encodeURIComponent("0x1::founder::is_founder")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                          }}
                          className="rounded-md px-2 py-0.5 bg-blue-800"
                        >
                          <Text className="text-white text-xs">View</Text>
                        </TouchableOpacity>
                      </View>
                    </Row>

                    {getObservableValue(extendedData?.founder?.isFounder, false) && (
                      <Row alignItems="center">
                        <Text className="text-text-light text-sm mr-2">Has Human Friends:</Text>
                        {getObservableValue(extendedData?.founder?.hasFriends, false) ? (
                          <View className="bg-green-800 px-2 py-0.5 rounded-md">
                            <Text className="text-white text-xs">Yes</Text>
                          </View>
                        ) : (
                          <View className="bg-red-800 px-2 py-0.5 rounded-md">
                            <Text className="text-white text-xs">No</Text>
                          </View>
                        )}
                        <View className="ml-2">
                          <TouchableOpacity
                            onPress={() => {
                              router.push(`/view?initialPath=${encodeURIComponent("0x1::founder::has_friends")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                            }}
                            className="rounded-md px-2 py-0.5 bg-blue-800"
                          >
                            <Text className="text-white text-xs">View</Text>
                          </TouchableOpacity>
                        </View>
                      </Row>
                    )}
                  </View>

                  {/* 3. Community Wallet Status Section */}
                  <Row justifyContent="between" alignItems="center" className="mb-3">
                    <Text className="text-text-light text-base font-bold">Community Wallet Status</Text>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#E75A5C" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Refreshing community wallet status');
                          refreshAccount();
                        }}
                        className="p-1.5 bg-primary rounded-md flex items-center justify-center w-8 h-8"
                      >
                        <MaterialIcons name="refresh" size={14} color="white" />
                      </TouchableOpacity>
                    )}
                  </Row>
                  <View className="bg-background rounded px-3 py-3 mb-4">
                    <Row alignItems="center" className="mb-2">
                      <Text className="text-text-light text-sm mr-2">Community Wallet:</Text>
                      {getObservableValue(extendedData?.communityWallet?.isDonorVoice, false) ? (
                        <View className="bg-green-800 px-2 py-0.5 rounded-md">
                          <Text className="text-white text-xs">Yes</Text>
                        </View>
                      ) : (
                        <View className="bg-gray-700 px-2 py-0.5 rounded-md">
                          <Text className="text-gray-300 text-xs">No</Text>
                        </View>
                      )}
                      <View className="ml-2">
                        <TouchableOpacity
                          onPress={() => {
                            router.push(`/view?initialPath=${encodeURIComponent("0x1::donor_voice::is_donor_voice")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                          }}
                          className="rounded-md px-2 py-0.5 bg-blue-800"
                        >
                          <Text className="text-white text-xs">View</Text>
                        </TouchableOpacity>
                      </View>
                    </Row>

                    {getObservableValue(extendedData?.communityWallet?.isDonorVoice, false) && (
                      <>
                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Reauthorization Proposed:</Text>
                          {getObservableValue(extendedData?.communityWallet?.isReauthProposed, false) ? (
                            <View className="bg-blue-800 px-2 py-0.5 rounded-md">
                              <Text className="text-white text-xs">Pending</Text>
                            </View>
                          ) : (
                            <View className="bg-gray-700 px-2 py-0.5 rounded-md">
                              <Text className="text-gray-300 text-xs">None</Text>
                            </View>
                          )}
                          <View className="ml-2">
                            <TouchableOpacity
                              onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent("0x1::donor_voice_governance::is_reauth_proposed")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                              }}
                              className="rounded-md px-2 py-0.5 bg-blue-800"
                            >
                              <Text className="text-white text-xs">View</Text>
                            </TouchableOpacity>
                          </View>
                        </Row>

                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Authorization Status:</Text>
                          {getObservableValue(extendedData?.communityWallet?.isAuthorized, false) ? (
                            <View className="bg-green-800 px-2 py-0.5 rounded-md">
                              <Text className="text-white text-xs">Authorized</Text>
                            </View>
                          ) : (
                            <View className="bg-red-800 px-2 py-0.5 rounded-md">
                              <Text className="text-white text-xs">Not Authorized</Text>
                            </View>
                          )}
                          <View className="ml-2">
                            <TouchableOpacity
                              onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent("0x1::donor_voice_reauth::is_authorized")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                              }}
                              className="rounded-md px-2 py-0.5 bg-blue-800"
                            >
                              <Text className="text-white text-xs">View</Text>
                            </TouchableOpacity>
                          </View>
                        </Row>

                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Within Auth Window:</Text>
                          {getObservableValue(extendedData?.communityWallet?.isWithinAuthorizeWindow, false) ? (
                            <View className="bg-green-800 px-2 py-0.5 rounded-md">
                              <Text className="text-white text-xs">Yes</Text>
                            </View>
                          ) : (
                            <View className="bg-red-800 px-2 py-0.5 rounded-md">
                              <Text className="text-white text-xs">No</Text>
                            </View>
                          )}
                          <View className="ml-2">
                            <TouchableOpacity
                              onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent("0x1::donor_voice_reauth::is_within_authorize_window")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                              }}
                              className="rounded-md px-2 py-0.5 bg-blue-800"
                            >
                              <Text className="text-white text-xs">View</Text>
                            </TouchableOpacity>
                          </View>
                        </Row>

                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Initialized:</Text>
                          {getObservableValue(extendedData?.communityWallet?.isInitialized, false) ? (
                            <View className="bg-green-800 px-2 py-0.5 rounded-md">
                              <Text className="text-white text-xs">Yes</Text>
                            </View>
                          ) : (
                            <View className="bg-red-800 px-2 py-0.5 rounded-md">
                              <Text className="text-white text-xs">No</Text>
                            </View>
                          )}
                          <View className="ml-2">
                            <TouchableOpacity
                              onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent("0x1::community_wallet::is_init")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                              }}
                              className="rounded-md px-2 py-0.5 bg-blue-800"
                            >
                              <Text className="text-white text-xs">View</Text>
                            </TouchableOpacity>
                          </View>
                        </Row>

                        {/* Veto Tally - Only show if it's greater than 0 */}
                        {getObservableValue(extendedData?.communityWallet?.vetoTally, 0) > 0 && (
                          <Row alignItems="center">
                            <Text className="text-text-light text-sm mr-2">Veto Tally:</Text>
                            <Text className="text-white text-sm">
                              {getObservableValue(extendedData?.communityWallet?.vetoTally, 0)}%
                            </Text>
                            <View className="ml-2">
                              <TouchableOpacity
                                onPress={() => {
                                  router.push(`/view?initialPath=${encodeURIComponent("0x1::donor_voice_governance::get_veto_tally")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                                }}
                                className="rounded-md px-2 py-0.5 bg-blue-800"
                              >
                                <Text className="text-white text-xs">View</Text>
                              </TouchableOpacity>
                            </View>
                          </Row>
                        )}
                      </>
                    )}
                  </View>

                  {/* 4. Vouch Score Section */}
                  <Row justifyContent="between" alignItems="center" className="mb-3">
                    <Text className="text-text-light text-base font-bold">Vouch Score</Text>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#E75A5C" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Refreshing vouch score');
                          refreshAccount();
                        }}
                        className="p-1.5 bg-primary rounded-md flex items-center justify-center w-8 h-8"
                      >
                        <MaterialIcons name="refresh" size={14} color="white" />
                      </TouchableOpacity>
                    )}
                  </Row>
                  <View className="bg-background rounded px-3 py-3 mb-4">
                    <Row alignItems="center" className="mb-2">
                      <Text className="text-text-light text-sm mr-2">Score:</Text>
                      <Text className="text-white font-mono text-sm">{getObservableValue(extendedData?.vouching?.vouchScore, 0)}</Text>
                      <View className="ml-2">
                        <TouchableOpacity
                          onPress={() => {
                            router.push(`/view?initialPath=${encodeURIComponent("0x1::vouch_score::evaluate_users_vouchers")}&initialArgs=${encodeURIComponent(`["0x1"], "${getObservableValue(accountData.address, '')}"`)}`)
                          }}
                          className="rounded-md px-2 py-0.5 bg-blue-800"
                        >
                          <Text className="text-white text-xs">View</Text>
                        </TouchableOpacity>
                      </View>
                    </Row>

                    <Row alignItems="center">
                      <Text className="text-text-light text-sm mr-2">Valid for Reactivation:</Text>
                      {getObservableValue(extendedData?.vouching?.hasValidVouchScore, false) ? (
                        <View className="bg-green-800 px-2 py-0.5 rounded-md">
                          <Text className="text-white text-xs">Yes</Text>
                        </View>
                      ) : (
                        <View className="bg-red-800 px-2 py-0.5 rounded-md">
                          <Text className="text-white text-xs">No</Text>
                        </View>
                      )}
                      <View className="ml-2">
                        <TouchableOpacity
                          onPress={() => {
                            router.push(`/view?initialPath=${encodeURIComponent("0x1::founder::is_voucher_score_valid")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                          }}
                          className="rounded-md px-2 py-0.5 bg-blue-800"
                        >
                          <Text className="text-white text-xs">View</Text>
                        </TouchableOpacity>
                      </View>
                    </Row>

                    {/* Vouch Score Progress Bar */}
                    <View className="mt-3">
                      <View className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.min(100, (getObservableValue(extendedData?.vouching?.vouchScore, 0) / 3) * 100)}%`
                          }}
                        />
                      </View>
                      <View className="flex-row justify-between mt-1">
                        <Text className="text-gray-500 text-xs">0</Text>
                        <Text className="text-gray-500 text-xs">Threshold: 2</Text>
                        <Text className="text-gray-500 text-xs">3+</Text>
                      </View>
                    </View>
                  </View>

                  {/* 5. Validator Status Section */}
                  <Row justifyContent="between" alignItems="center" className="mb-3">
                    <Text className="text-text-light text-base font-bold">Validator Status</Text>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#E75A5C" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Refreshing validator status');
                          refreshAccount();
                        }}
                        className="p-1.5 bg-primary rounded-md flex items-center justify-center w-8 h-8"
                      >
                        <MaterialIcons name="refresh" size={14} color="white" />
                      </TouchableOpacity>
                    )}
                  </Row>
                  <View className="bg-background rounded px-3 py-3 mb-4">
                    <Row alignItems="center" className="mb-2">
                      <Text className="text-text-light text-sm mr-2">Validator:</Text>
                      {getObservableValue(extendedData?.validator?.isValidator, false) ? (
                        <View className="bg-green-800 px-2 py-0.5 rounded-md">
                          <Text className="text-white text-xs">Yes</Text>
                        </View>
                      ) : (
                        <View className="bg-gray-700 px-2 py-0.5 rounded-md">
                          <Text className="text-gray-300 text-xs">No</Text>
                        </View>
                      )}
                      <View className="ml-2">
                        <TouchableOpacity
                          onPress={() => {
                            router.push(`/view?initialPath=${encodeURIComponent("0x1::stake::get_current_validators")}&initialArgs=${encodeURIComponent(``)}`)
                          }}
                          className="rounded-md px-2 py-0.5 bg-blue-800"
                        >
                          <Text className="text-white text-xs">View All</Text>
                        </TouchableOpacity>
                      </View>
                    </Row>

                    {getObservableValue(extendedData?.validator?.isValidator, false) && (
                      <>
                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Current Bid:</Text>
                          <Text className="text-white text-sm">
                            {getObservableValue(extendedData?.validator?.currentBid, 0)}
                          </Text>
                          <View className="ml-2">
                            <TouchableOpacity
                              onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent("0x1::proof_of_fee::current_bid")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                              }}
                              className="rounded-md px-2 py-0.5 bg-blue-800"
                            >
                              <Text className="text-white text-xs">View</Text>
                            </TouchableOpacity>
                          </View>
                        </Row>

                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Validator Grade:</Text>
                          <View className="flex-row items-center">
                            <View className={`mr-2 px-2 py-0.5 rounded-md ${getObservableValue(extendedData?.validator?.grade?.isCompliant, false) ? 'bg-green-800' : 'bg-red-800'}`}>
                              <Text className="text-white text-xs">
                                {getObservableValue(extendedData?.validator?.grade?.isCompliant, false) ? 'Compliant' : 'Non-Compliant'}
                              </Text>
                            </View>
                            <Text className="text-white text-xs mr-1">
                              {`Proposals Accepted: ${getObservableValue(extendedData?.validator?.grade?.acceptedProposals, 0)}`}
                            </Text>
                            <Text className="text-white text-xs">
                              {`Proposals Failed: ${getObservableValue(extendedData?.validator?.grade?.failedProposals, 0)}`}
                            </Text>
                          </View>
                          <View className="ml-2">
                            <TouchableOpacity
                              onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent("0x1::grade::get_validator_grade")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                              }}
                              className="rounded-md px-2 py-0.5 bg-blue-800"
                            >
                              <Text className="text-white text-xs">View</Text>
                            </TouchableOpacity>
                          </View>
                        </Row>

                        <Row alignItems="center" className="mb-2">
                          <Text className="text-text-light text-sm mr-2">Jail Reputation:</Text>
                          <Text className="text-white text-sm">
                            {getObservableValue(extendedData?.validator?.jailReputation, 0)}
                          </Text>
                          <View className="ml-2">
                            <TouchableOpacity
                              onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent("0x1::jail::get_jail_reputation")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                              }}
                              className="rounded-md px-2 py-0.5 bg-blue-800"
                            >
                              <Text className="text-white text-xs">View</Text>
                            </TouchableOpacity>
                          </View>
                        </Row>

                        <Row alignItems="center">
                          <Text className="text-text-light text-sm mr-2">Buddies Jailed:</Text>
                          <Text className="text-white text-sm">
                            {getObservableValue(extendedData?.validator?.countBuddiesJailed, 0)}
                          </Text>
                          <View className="ml-2">
                            <TouchableOpacity
                              onPress={() => {
                                router.push(`/view?initialPath=${encodeURIComponent("0x1::jail::get_count_buddies_jailed")}&initialArgs=${encodeURIComponent(`"${getObservableValue(accountData.address, '')}"`)}`)
                              }}
                              className="rounded-md px-2 py-0.5 bg-blue-800"
                            >
                              <Text className="text-white text-xs">View</Text>
                            </TouchableOpacity>
                          </View>
                        </Row>
                      </>
                    )}
                  </View>
                </View>
              </Column>
            </TwoColumn>
          </Card>

          {/* Resources Section */}
          {(() => {
            // Get resources directly using our helper regardless of any previous state
            const rawAccount = accountData;

            // Try multiple ways to access resources
            let resources = [];
            if (rawAccount?.resources) {
              resources = extractResources(rawAccount);
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
              <Card className="mb-4">
                <Row justifyContent="between" alignItems="center" className="mb-3">
                  <Text className="text-text-light text-lg font-bold">
                    Resources ({resources.length})
                  </Text>
                  <Text className="text-gray-500 text-sm">{filteredResources.length} resources of this type</Text>
                </Row>

                {/* Resource Type Navigation and Content with responsive layout */}
                <TwoColumn
                  leftWidth="w-full md:w-1/4"
                  rightWidth="w-full md:w-3/4"
                  spacing="space-y-4 md:space-y-0 md:space-x-8"
                  stackOnMobile={true}
                >
                  {/* Left Side - Resource Categories */}
                  <Column>
                    {Object.entries(categorizeResourceTypes(typesList as string[])).map(([category, categoryTypes]) => (
                      <View key={category} className="mb-4">
                        {/* Category Header with Background */}
                        <View className="mb-2 bg-secondary/40 py-1.5 px-2 rounded-md">
                          <Text className="text-white text-sm font-bold uppercase">{category}</Text>
                        </View>

                        {/* Resource Type Buttons */}
                        <View className="flex-row flex-wrap">
                          {(categoryTypes as string[]).map((type: string) => {
                            // Use our formatter for display names
                            let shortName = formatDisplayName(type);

                            // Keep special cases for validator resources for better display
                            if (type.toLowerCase().includes('validatorconfig')) {
                              shortName = 'Validator Config';
                            } else if (type.toLowerCase().includes('validatorstate')) {
                              shortName = 'Validator State';
                            } else if (type.toLowerCase().includes('validatorset')) {
                              shortName = 'Validator Set';
                            }

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
                                onPress={() => handleResourceTypeChange(type)}
                                className={`px-3 py-2 rounded-md m-1 min-w-[110px] ${isActive ? activeBgColor : bgColor}`}
                              >
                                <Text
                                  className={`text-sm font-medium text-center ${isActive ? 'text-white' : 'text-gray-300'}`}
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
                  </Column>

                  {/* Right Side - Resource Content */}
                  <Column>
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
                            <Row
                              justifyContent="between"
                              alignItems="center"
                              className={`p-3 border-l-4 ${borderColor}`}
                            >
                              <Text className="text-white font-bold text-sm flex-1">{resource.type}</Text>
                              <TouchableOpacity
                                onPress={() => copyToClipboard(JSON.stringify(resource.data, null, 2))}
                                className="p-1.5 bg-primary rounded-md flex items-center justify-center w-8 h-8"
                              >
                                <MaterialIcons name="content-copy" size={14} color="white" />
                              </TouchableOpacity>
                            </Row>
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
                  </Column>
                </TwoColumn>
              </Card>
            );
          })()}

          {/* Account Transactions Section */}
          {accountData && getObservableValue(accountData.address, '') && (
            <Card className="w-full overflow-hidden">
              <AccountTransactionsList
                accountAddress={getObservableValue(accountData.address, '')}
                initialLimit={appConfig.transactions.defaultLimit}
                onRefresh={() => {
                  console.log('Manual refresh triggered');
                  setIsAutoRefreshing(true);
                  refreshAccount()
                    .then(() => console.log('Manual refresh completed successfully'))
                    .catch(err => console.error('Error during manual refresh:', err))
                    .finally(() => {
                      setTimeout(() => setIsAutoRefreshing(false), 500);
                    });
                }}
                isVisible={isFocused}
              />
            </Card>
          )}
        </Container>
      </ScrollView>
    </View>
  );
}); 