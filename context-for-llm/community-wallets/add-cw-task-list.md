# Community Wallets Feature Implementation Task List

## Overview

This document provides a comprehensive implementation plan for adding the "Community Wallets" feature to the OL Explorer application. The feature will display community-owned wallets with their balances and names, following the established architectural patterns of the application.

## Background & Context

The OL Explorer application currently displays blockchain metrics, supply statistics, and transaction data. The Community Wallets feature will add a new section to display specially designated community-owned wallets with their balances and names fetched from a GitHub repository.

## Data Flow Architecture

The implementation strictly follows the established data flow pattern of the application:

```
SDK → SDK Context → LegendApp Store → Hooks → Unwrap State → Component → View
```

This architecture promotes:
- Separation of concerns
- Consistent state management
- Efficient data fetching and caching
- Proper memory management
- Reactive UI updates

## Existing Pattern Analysis

A thorough analysis of the existing `AccountDetails` component revealed these key patterns:

1. **SDK Level (SdkContext.tsx):**
   - Provides core SDK methods for blockchain interactions
   - Initializes connection to the blockchain
   - Offers basic data fetch functions

2. **SDK Extension (useSdk.ts):**
   - Extends SDK with application-specific functions
   - Includes specialized methods for data retrieval
   - Provides utility functions for normalized data handling
   - Implements proper error handling and fallbacks

3. **Store Level (accountStore.ts):**
   - Defines observable state structure with LegendApp
   - Provides store actions to update state
   - Implements data staleness checks
   - Uses `notifyUpdate()` for consistent state updates

4. **Hook Level (useAccount.ts):**
   - Connects SDK to store 
   - Handles data fetching, caching, and polling
   - Manages component lifecycle (mounting, visibility)
   - Returns unwrapped data to components
   - Implements memory management and cleanup

5. **Component Level (AccountDetails.tsx):**
   - Uses observer pattern to react to state changes
   - Implements `unwrapObservable()` for accessing nested observable data
   - Provides `getObservableValue()` helper with fallbacks
   - Handles rendering different data states (loading, error, success)

## Implementation Tasks

When working through tasks, use the following checkbox states:
- `[ ]` Task not yet started
- `[~]` Task in progress
- `[x]` Task completed

### Task 1: Extend SDK with GitHub Fetch Functionality
- [ ] (2) Identify the proper location in `useSdk.ts` to add the new method
- [ ] (4) Implement `getCommunityWalletNames()` method
  - [ ] (3) Add fetch functionality for GitHub JSON file
  - [ ] (3) Add proper error handling
  - [ ] (4) Add data validation
  - [ ] (5) Implement address normalization
  - [ ] (1) Add method to SDK return object
- [ ] (3) Test the SDK extension with mock data

```typescript
// Code snippet for Task 1
const getCommunityWalletNames = async (): Promise<Record<string, string>> => {
  try {
    const response = await fetch('https://raw.githubusercontent.com/0LNetworkCommunity/v7-addresses/refs/heads/main/community-wallets.json');
    
    if (!response.ok) {
      throw new Error(`GitHub API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate data format
    if (!data || !data.communityWallets) {
      throw new Error('Invalid wallet name data format');
    }
    
    // Create a map of normalized addresses to names
    const nameMap: Record<string, string> = {};
    
    // For each address, normalize and extract the name
    Object.entries(data.communityWallets).forEach(([hash, info]: [string, any]) => {
      const normalizedAddress = normalizeAddress(hash);
      nameMap[normalizedAddress] = info.name || 'Community Wallet';
    });
    
    return nameMap;
  } catch (error) {
    console.error('Error fetching community wallet names:', error);
    // Return empty object instead of failing completely
    return {};
  }
};

// Add to the return block in useSdk
return {
  ...sdk,
  // ... existing methods
  getCommunityWalletNames
};
```

**Definition of Done:**
- [ ] Method successfully fetches data from GitHub repository
- [ ] Method properly handles network errors
- [ ] Method validates response data structure
- [ ] Method normalizes addresses consistently
- [ ] Method is properly exported in SDK

### Task 2: Create Community Wallet Store
- [ ] (1) Create new file `communityWalletStore.ts`
- [ ] (2) Define data staleness configuration
- [ ] (3) Define interfaces for community wallet data
- [ ] (4) Create observable store with LegendApp
- [ ] (5) Implement store actions
  - [ ] (3) Add setWallet action
  - [ ] (2) Add setLoading action
  - [ ] (2) Add setError action
  - [ ] (3) Add forceUpdate action
  - [ ] (3) Add isDataStale utility
  - [ ] (4) Add isWalletDataStale utility
- [ ] (4) Implement notifyUpdate mechanism for reactivity

```typescript
// Code snippet for Task 2
import { observable } from '@legendapp/state';
import appConfig from '../config/appConfig';

// Config for data freshness
export const COMMUNITY_WALLET_CONFIG = {
  MIN_FRESHNESS_MS: 30000, // 30 seconds
  REFRESH_INTERVAL_MS: 60000 // 1 minute
};

// Define wallet data interface
export interface CommunityWalletData {
  address: string;
  name: string;
  balance: number;
}

// Define the store structure with record pattern
export interface CommunityWalletStoreType {
  wallets: Record<string, {
    data: CommunityWalletData | null;
    lastUpdated: number;
  }>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

// Initialize the store with default values
export const communityWalletStore = observable<CommunityWalletStoreType>({
  wallets: {},
  isLoading: false,
  error: null,
  lastUpdated: 0
});

// Function to notify global state updates
const notifyUpdate = () => {
  // Update lastUpdated timestamp to trigger reactivity
  communityWalletStore.set(prev => ({
    ...prev,
    lastUpdated: Date.now()
  }));
  
  // If we're in a browser environment, dispatch event for components
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('community-wallets-updated', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }
};

// Store actions for updating state
export const communityWalletActions = {
  // Set or update a single wallet
  setWallet: (address: string, data: CommunityWalletData) => {
    const normalizedAddress = address;
    
    // Initialize if doesn't exist
    if (!communityWalletStore.wallets[normalizedAddress].peek()) {
      communityWalletStore.wallets[normalizedAddress].set({
        data: data,
        lastUpdated: Date.now()
      });
    } else {
      // Update existing entry
      communityWalletStore.wallets[normalizedAddress].data.set(data);
      communityWalletStore.wallets[normalizedAddress].lastUpdated.set(Date.now());
    }
    
    notifyUpdate();
  },
  
  // Set loading state
  setLoading: (isLoading: boolean) => {
    communityWalletStore.isLoading.set(isLoading);
    notifyUpdate();
  },
  
  // Set error state
  setError: (error: string | null) => {
    communityWalletStore.error.set(error);
    notifyUpdate();
  },
  
  // Force refresh UI
  forceUpdate: () => {
    communityWalletStore.isLoading.set(true);
    communityWalletStore.error.set(null);
    
    // Update lastUpdated to trigger reactivity 
    notifyUpdate();
    
    // Reset loading after a short delay
    setTimeout(() => {
      communityWalletStore.isLoading.set(false);
      notifyUpdate();
    }, 50);
    
    return true;
  },
  
  // Check if data is stale
  isDataStale: (): boolean => {
    const lastUpdated = communityWalletStore.lastUpdated.peek();
    const now = Date.now();
    return now - lastUpdated > COMMUNITY_WALLET_CONFIG.MIN_FRESHNESS_MS;
  },
  
  // Check if a specific wallet's data is stale
  isWalletDataStale: (address: string): boolean => {
    const wallet = communityWalletStore.wallets[address].peek();
    if (!wallet) return true;
    
    const now = Date.now();
    return now - wallet.lastUpdated > COMMUNITY_WALLET_CONFIG.MIN_FRESHNESS_MS;
  }
};
```

**Definition of Done:**
- [ ] Store is properly defined with LegendApp observables
- [ ] Data structure uses record pattern for consistency with existing stores
- [ ] All required actions are implemented
- [ ] Store follows data staleness pattern from accountStore
- [ ] notifyUpdate mechanism properly triggers UI updates

### Task 3: Create Community Wallet Hook
- [ ] (1) Create new file `useCommunityWallets.ts`
- [ ] (3) Define hook return type interface
- [ ] (5) Implement SDK and store connections
- [ ] (6) Add state management for component lifecycle
  - [ ] (3) Set up isMounted ref to track component mount state
  - [ ] (4) Implement useEffect for initialization and cleanup
  - [ ] (4) Add AppState change listener
  - [ ] (3) Create reference for tracking polling interval
- [ ] (7) Implement data fetching logic
  - [ ] (4) Add fetch method with force refresh option
  - [ ] (7) Add parallel data fetching with Promise.allSettled
    - [ ] (3) Set up Promise.allSettled structure
    - [ ] (4) Add separate fetch for wallet addresses
    - [ ] (4) Add separate fetch for wallet names
    - [ ] (5) Implement error handling for individual promises
  - [ ] (6) Add proper error handling for each data source
    - [ ] (3) Implement try/catch structure
    - [ ] (3) Add conditional error handling for address fetches
    - [ ] (3) Add conditional error handling for name fetches
    - [ ] (4) Create fallback logic for partial data success
- [ ] (5) Implement polling mechanism
  - [ ] (4) Add interval management
  - [ ] (5) Add app state change handling
- [ ] (5) Implement data transformation for component
- [ ] (6) Add proper memory management and cleanup
  - [ ] (3) Clear intervals on component unmount
  - [ ] (3) Remove event listeners
  - [ ] (4) Prevent state updates after unmount
  - [ ] (3) Handle state cleanup

```typescript
// Code snippet for Task 3
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useObservable } from '@legendapp/state/react';
import { useSdk } from './useSdk';
import { useSdkContext } from '../context/SdkContext';
import { communityWalletStore, communityWalletActions, CommunityWalletData } from '../store/communityWalletStore';

interface UseCommunityWalletsResult {
  wallets: CommunityWalletData[];
  isLoading: boolean;
  error: string | null;
  refresh: (force?: boolean) => Promise<void>;
  isStale: boolean;
}

export const useCommunityWallets = (isVisible = true): UseCommunityWalletsResult => {
  const sdk = useSdk();
  const { isInitialized } = useSdkContext();
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const isStale = communityWalletActions.isDataStale();
  
  // Get store data using observables
  const walletsObservable = useObservable(communityWalletStore.wallets);
  const isLoadingObservable = useObservable(communityWalletStore.isLoading);
  const errorObservable = useObservable(communityWalletStore.error);
  
  // Refs for state management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);
  
  // Set isMounted ref on mount/unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // App state change handler
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);
  
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      if (isVisible && isMounted.current) {
        fetchCommunityWallets(true);
      }
    }
    appState.current = nextAppState;
  };
  
  // Set up polling based on visibility
  useEffect(() => {
    if (isVisible && isInitialized) {
      startPolling();
      // Initial fetch
      fetchCommunityWallets();
    } else {
      stopPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [isVisible, isInitialized]);
  
  const startPolling = () => {
    if (!pollingIntervalRef.current && isVisible) {
      pollingIntervalRef.current = setInterval(() => {
        if (!isAutoRefreshing && isVisible && isMounted.current) {
          fetchCommunityWallets();
        }
      }, COMMUNITY_WALLET_CONFIG.REFRESH_INTERVAL_MS);
    }
  };
  
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
  
  const fetchCommunityWallets = async (force = false) => {
    // Skip fetch if data is fresh enough and force is false
    if (!force && !communityWalletActions.isDataStale()) {
      return;
    }
    
    try {
      // Show loading state
      if (isMounted.current) {
        setIsAutoRefreshing(true);
        communityWalletActions.setLoading(true);
      }
      
      // Fetch all data in parallel
      const results = await Promise.allSettled([
        sdk.getAllCommunityWallets(),
        sdk.getCommunityWalletNames()
      ]);
      
      // Process results separately for better error handling
      let addresses: string[] = [];
      let namesMap: Record<string, string> = {};
      
      if (results[0].status === 'fulfilled') {
        addresses = results[0].value;
      } else {
        console.error('Error fetching community wallet addresses:', results[0].reason);
        throw new Error('Failed to fetch community wallet addresses');
      }
      
      if (results[1].status === 'fulfilled') {
        namesMap = results[1].value;
      } else {
        console.warn('Error fetching community wallet names:', results[1].reason);
        // Continue with empty names rather than failing completely
        namesMap = {};
      }
      
      // Early return if no wallets found
      if (!addresses || addresses.length === 0) {
        if (isMounted.current) {
          communityWalletActions.setError(null);
        }
        return;
      }
      
      // Fetch balance data for each wallet
      const balancePromises = addresses.map(async (address) => {
        try {
          const account = await sdk.getAccount(address);
          const name = namesMap[address] || 'Community Wallet';
          
          // Create wallet data
          const walletData: CommunityWalletData = {
            address,
            name,
            balance: account?.balance || 0
          };
          
          // Update store with this wallet
          if (isMounted.current) {
            communityWalletActions.setWallet(address, walletData);
          }
          
          return walletData;
        } catch (err) {
          console.error(`Error fetching data for wallet ${address}:`, err);
          // Still return basic wallet data
          const walletData: CommunityWalletData = {
            address,
            name: namesMap[address] || 'Community Wallet',
            balance: 0
          };
          
          // Update store with this wallet
          if (isMounted.current) {
            communityWalletActions.setWallet(address, walletData);
          }
          
          return walletData;
        }
      });
      
      // Wait for all balance fetches to complete
      await Promise.allSettled(balancePromises);
      
      // Clear any errors
      if (isMounted.current) {
        communityWalletActions.setError(null);
      }
    } catch (error) {
      console.error('Error fetching community wallet data:', error);
      
      // Set error state
      if (isMounted.current) {
        communityWalletActions.setError(
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      }
    } finally {
      // Update loading state
      if (isMounted.current) {
        communityWalletActions.setLoading(false);
        
        // Small delay before turning off refresh indicator
        setTimeout(() => {
          if (isMounted.current) {
            setIsAutoRefreshing(false);
          }
        }, 500);
      }
    }
  };
  
  // Public refresh function
  const refresh = async (force = true) => {
    await fetchCommunityWallets(force);
  };
  
  // Transform record of wallets to array for component
  const getWalletsArray = (): CommunityWalletData[] => {
    const walletsRecord = walletsObservable?.get ? walletsObservable.get() : {};
    const walletEntries = Object.entries(walletsRecord);
    
    return walletEntries
      .filter(([_, wallet]) => wallet && wallet.data)
      .map(([_, wallet]) => wallet.data as CommunityWalletData)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  };
  
  return {
    wallets: getWalletsArray(),
    isLoading: isLoadingObservable?.get ? Boolean(isLoadingObservable.get()) : false,
    error: errorObservable?.get ? String(errorObservable.get()) : null,
    refresh,
    isStale
  };
};
```

**Definition of Done:**
- [ ] Hook is properly connected to SDK and store
- [ ] Data fetching implementation matches existing patterns
- [ ] Polling mechanism works correctly
- [ ] App state changes are properly handled
- [ ] Memory management prevents memory leaks
- [ ] Data transformation provides component-ready data format
- [ ] Error handling works properly at all levels

### Task 4: Create Community Wallets Component
- [ ] (1) Create new file `CommunityWallets.tsx`
- [ ] (6) Implement unwrapObservable function
  - [ ] (3) Add basic structure for recursive function
  - [ ] (4) Implement handling for primitive values and null/undefined
  - [ ] (4) Implement handling for LegendState observable objects
  - [ ] (3) Implement handling for arrays
  - [ ] (4) Implement handling for plain objects
  - [ ] (3) Add error handling for each case
- [ ] (3) Add getObservableValue helper
- [ ] (4) Implement formatBalance utility
- [ ] (7) Create component structure following AccountDetails pattern
  - [ ] (3) Set up component skeleton with observer pattern
  - [ ] (3) Add Card layout with consistent styling
  - [ ] (4) Create header with title and refresh button
  - [ ] (4) Implement conditional rendering for different states
  - [ ] (4) Add wallet list rendering logic
- [ ] (6) Add responsive design support
  - [ ] (5) Implement desktop view with table layout
  - [ ] (6) Implement mobile view with card layout
    - [ ] (3) Add mobile breakpoint detection
    - [ ] (4) Create card layout for mobile
    - [ ] (3) Style individual wallet cards consistently
    - [ ] (3) Add proper spacing and margins for mobile
- [ ] (5) Add UI state handling
  - [ ] (4) Add loading state
  - [ ] (4) Add error state
  - [ ] (3) Add empty state
- [ ] (3) Implement clipboard functionality
- [ ] (4) Add refresh mechanism
- [ ] (5) Implement observer pattern with LegendApp

```typescript
// Code snippet for Task 4
import React, { useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { observer } from '@legendapp/state/react';
import { useCommunityWallets } from '../hooks/useCommunityWallets';
import { formatAddressForDisplay, stripLeadingZeros } from '../utils/addressUtils';
import { Card, Row, Column } from '../components/Layout';
import Clipboard from '@react-native-clipboard/clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import tokenConfig from '../config/tokenConfig';

// Token decimals for formatting balances
const TOKEN_DECIMALS = tokenConfig.tokens.libraToken.decimals;

// Helper to unwrap observable values recursively - exact same as AccountDetails
const unwrapObservable = (value: any): any => {
  try {
    // Handle undefined/null
    if (value === undefined || value === null) {
      return value;
    }

    // Handle observable with get() method (LegendState observable)
    if (typeof value === 'object' && value !== null) {
      // Check if it has a get method that seems to be a function
      if (typeof value.get === 'function') {
        try {
          const unwrappedValue = value.get();
          // Recursively unwrap the result
          return unwrapObservable(unwrappedValue);
        } catch (e) {
          console.warn('Error unwrapping observable with get():', e);
          // Return original value if get() fails
          return value;
        }
      }

      // Handle Observable Proxy objects
      if (value.constructor && value.constructor.name === 'Proxy') {
        // Try to access the target if available
        if (value.valueOf) {
          try {
            return unwrapObservable(value.valueOf());
          } catch (e) {
            // Silent fail and continue with normal object handling
          }
        }
      }

      // Handle arrays
      if (Array.isArray(value)) {
        try {
          return value.map((item: any) => unwrapObservable(item));
        } catch (e) {
          console.warn('Error unwrapping array:', e);
          return value;
        }
      }

      // Handle plain objects
      try {
        const result: Record<string, any> = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            result[key] = unwrapObservable(value[key]);
          }
        }
        return result;
      } catch (e) {
        console.warn('Error unwrapping object:', e);
        return value;
      }
    }

    // Return primitives as is
    return value;
  } catch (e) {
    console.warn('Unexpected error in unwrapObservable:', e);
    // If all else fails, return the original value
    return value;
  }
};

// Add a helper function to safely get values from observables
const getObservableValue = <T,>(value: any, defaultValue: T): T => {
  return unwrapObservable(value) ?? defaultValue;
};

// Format balance with proper token decimals - similar to AccountDetails
const formatBalance = (balance: number): string => {
  if (!balance && balance !== 0) return '0';
  
  // Calculate whole and fractional parts based on TOKEN_DECIMALS
  const divisor = Math.pow(10, TOKEN_DECIMALS);
  const wholePart = Math.floor(balance / divisor);
  const fractionalPart = balance % divisor;
  
  // Format with proper decimal places
  const wholePartFormatted = wholePart.toLocaleString();
  
  // Convert fractional part to string with proper padding
  const fractionalStr = fractionalPart.toString().padStart(TOKEN_DECIMALS, '0');
  
  // Trim trailing zeros but keep at least 2 decimal places if there's a fractional part
  const trimmedFractional = fractionalPart > 0
    ? fractionalStr.replace(/0+$/, '').padEnd(2, '0')
    : '00';
  
  // Only show decimal part if it's non-zero
  return trimmedFractional === '00'
    ? `${wholePartFormatted} ${tokenConfig.tokens.libraToken.symbol}`
    : `${wholePartFormatted}.${trimmedFractional} ${tokenConfig.tokens.libraToken.symbol}`;
};

type CommunityWalletsProps = {
  isVisible?: boolean;
};

export const CommunityWallets = observer(({ isVisible = true }: CommunityWalletsProps) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  
  // Use our custom hook
  const { wallets, isLoading, error, refresh, isStale } = useCommunityWallets(isVisible);
  
  const copyToClipboard = (text: string) => {
    try {
      // Use the same stripLeadingZeros function for consistency
      const addressToCopy = stripLeadingZeros(text);
      Clipboard.setString(addressToCopy);
      setCopySuccess('Address copied!');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Clipboard operation failed:', err);
    }
  };
  
  const handleRefresh = () => {
    refresh(true);
  };
  
  // Component rendering with responsive design - exactly like other components
  return (
    <View className="w-full mb-5">
      <Card>
        <View className="h-1 bg-primary/20" />
        <Row justifyContent="between" alignItems="center" className="px-4 py-3 border-b border-border/20">
          <Text className="text-white font-bold text-base">
            Community Wallets ({getObservableValue(wallets, []).length})
          </Text>
          <View className="w-8 h-8 justify-center items-center">
            {isLoading ? (
              <ActivityIndicator size="small" color="#E75A5C" />
            ) : (
              <TouchableOpacity onPress={handleRefresh} className="p-2">
                <Text className="text-primary">Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        </Row>
        
        <View className="p-4">
          {/* Loading state */}
          {isLoading && getObservableValue(wallets, []).length === 0 && (
            <View className="py-4 items-center">
              <ActivityIndicator size="large" color="#E75A5C" />
              <Text className="text-white text-base mt-2">Loading community wallets...</Text>
            </View>
          )}
          
          {/* Error state */}
          {error && (
            <View className="py-4 px-2">
              <Text className="text-red-500 text-base mb-2">Error: {error}</Text>
              <TouchableOpacity 
                className="bg-primary rounded-lg py-2 px-3 self-start"
                onPress={handleRefresh}
              >
                <Text className="text-white text-sm font-medium">Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Wallets table */}
          {!isLoading && !error && (
            <ScrollView>
              {/* Desktop view */}
              {isDesktop ? (
                <View>
                  {/* Table headers */}
                  <Row className="border-b border-border pb-2 mb-2">
                    <View className="flex-1">
                      <Text className="text-text-muted text-sm">Address</Text>
                    </View>
                    <View className="flex-2">
                      <Text className="text-text-muted text-sm">Name</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-text-muted text-sm text-right">Balance</Text>
                    </View>
                  </Row>
                  
                  {/* Table rows */}
                  {getObservableValue(wallets, []).map((wallet) => (
                    <Row key={wallet.address} className="py-2 border-b border-border/30">
                      <View className="flex-1">
                        <TouchableOpacity onPress={() => copyToClipboard(wallet.address)}>
                          <View className="flex-row items-center">
                            <Text className="text-text-light font-mono text-sm mr-1">
                              {formatAddressForDisplay(wallet.address, 6, 4)}
                            </Text>
                            <MaterialIcons name="content-copy" size={14} color="#A0AEC0" />
                          </View>
                        </TouchableOpacity>
                      </View>
                      <View className="flex-2">
                        <Text className="text-text-light text-sm">
                          {getObservableValue(wallet.name, 'Community Wallet')}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-text-light font-mono text-sm text-right">
                          {formatBalance(getObservableValue(wallet.balance, 0))}
                        </Text>
                      </View>
                    </Row>
                  ))}
                </View>
              ) : (
                /* Mobile view - stacked cards */
                <View className="space-y-3">
                  {getObservableValue(wallets, []).map((wallet) => (
                    <View 
                      key={wallet.address}
                      className="bg-background/50 rounded-lg p-3 border border-border/30"
                    >
                      <TouchableOpacity onPress={() => copyToClipboard(wallet.address)}>
                        <View className="flex-row items-center mb-2">
                          <Text className="text-text-light font-mono text-sm mr-1">
                            {formatAddressForDisplay(wallet.address, 6, 4)}
                          </Text>
                          <MaterialIcons name="content-copy" size={14} color="#A0AEC0" />
                        </View>
                      </TouchableOpacity>
                      
                      <Text className="text-text-light text-base mb-1">
                        {getObservableValue(wallet.name, 'Community Wallet')}
                      </Text>
                      
                      <Text className="text-text-light font-mono text-sm">
                        {formatBalance(getObservableValue(wallet.balance, 0))}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Empty state */}
              {getObservableValue(wallets, []).length === 0 && !isLoading && (
                <View className="py-6 items-center">
                  <Text className="text-white text-base text-center">
                    No community wallets found.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
          
          {/* Copy success message */}
          {copySuccess && (
            <View className="absolute right-4 top-4 bg-green-800/80 px-2 py-1 rounded z-10">
              <Text className="text-white text-xs">{copySuccess}</Text>
            </View>
          )}
        </View>
      </Card>
    </View>
  );
});
```

**Definition of Done:**
- [ ] Component properly uses the useCommunityWallets hook
- [ ] Observable unwrapping is implemented correctly
- [ ] Component handles all data states (loading, error, empty, success)
- [ ] Responsive design works on both desktop and mobile
- [ ] Clipboard functionality works correctly
- [ ] Styling is consistent with other components
- [ ] Component is properly exported as an observer component

### Task 5: HomeScreen Integration
- [ ] (3) Modify HomeScreen.tsx to include the CommunityWallets component
- [ ] (1) Add proper import statement
- [ ] (2) Position component in correct location (between SupplyStats and TransactionsList)
- [ ] (2) Pass isVisible prop correctly

```typescript
// Code snippet for Task 5
// In src/screens/HomeScreen.tsx

// Add import
import { CommunityWallets } from '../components/CommunityWallets';

// In the render section, add after SupplyStats
<Grid cols={1} gap={6} fullBleed={true} className="mb-4">
  {/* Blockchain metrics card */}
  <BlockchainMetrics />

  {/* Supply statistics card */}
  <SupplyStats isVisible={isScreenVisible} />
  
  {/* Community Wallets - new component */}
  <CommunityWallets isVisible={isScreenVisible} />

  {/* Transactions list */}
  <TransactionsList
    testID="transactions-list"
    onRefresh={handleRefresh}
    initialLimit={appConfig.transactions.defaultLimit}
    onLimitChange={handleLimitChange}
  />
  
  {/* Rest of the code... */}
</Grid>
```

**Definition of Done:**
- [ ] Component is properly imported in HomeScreen.tsx
- [ ] Component is correctly positioned in the UI
- [ ] isVisible prop is properly passed for visibility tracking
- [ ] Component renders correctly in overall layout

## Testing Plan

### Unit Testing
- [ ] (4) Test SDK extension with mock fetch responses
- [ ] (3) Test store actions with mock data
- [ ] (5) Test hook functionality with mock SDK
- [ ] (4) Test component rendering with mock hook data

### Integration Testing
- [ ] (6) Test data flow from SDK to component
  - [ ] (3) Verify data passes correctly from SDK to store
  - [ ] (3) Verify store updates trigger hook updates
  - [ ] (4) Verify hook data updates trigger component re-renders
- [ ] (5) Test UI responsiveness on different screen sizes
- [ ] (4) Test refresh functionality
- [ ] (5) Test error states and recovery

### End-to-End Testing
- [ ] (7) Test feature with real blockchain data
  - [ ] (3) Test with real SDK connected to blockchain
  - [ ] (4) Verify real wallet data displays correctly
  - [ ] (3) Ensure balances are formatted properly
  - [ ] (4) Verify names from GitHub are displayed correctly
- [ ] (5) Verify performance with multiple wallets
- [ ] (6) Verify polling behavior during app lifecycle changes
  - [ ] (3) Test when app goes to background
  - [ ] (3) Test when app comes to foreground
  - [ ] (4) Verify polling stops and starts appropriately

## Implementation Timeline

| Task | Estimated Time | Dependencies |
|------|----------------|--------------|
| SDK Extension | 30 minutes | None |
| Store Implementation | 1 hour | None |
| Hook Implementation | 2 hours | SDK Extension, Store Implementation |
| Component Creation | 1.5 hours | Hook Implementation |
| HomeScreen Integration | 30 minutes | Component Creation |
| Testing | 1.5 hours | All implementation tasks |
| **Total** | **6.5 hours** | |

## Technical Considerations

### Dependencies
- LegendApp State for observable state management
- React Native components for UI
- Clipboard functionality for copying addresses
- AppState for tracking application lifecycle

### Performance Considerations
- Implement proper data polling to avoid excessive API calls
- Use memoization to prevent unnecessary re-renders
- Implement proper data caching strategy
- Handle memory management to prevent memory leaks

### Error Handling Strategy
- Implement fallbacks for GitHub API failures
- Handle network errors gracefully
- Provide clear error messages to users
- Implement retry mechanisms

## Final Checklist

Before considering the implementation complete, ensure:

- [ ] All tasks have been completed according to the specifications
- [ ] Code follows the existing patterns and conventions
- [ ] All tests pass
- [ ] The component renders correctly on all screen sizes
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable
- [ ] No memory leaks are present
- [ ] Documentation is complete 