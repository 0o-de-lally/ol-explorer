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
   - **Critical Pattern**: Methods must be exposed at runtime, not just type definitions

3. **Store Level (accountStore.ts):**
   - Defines observable state structure with LegendApp
   - Provides store actions to update state
   - Implements data staleness checks
   - Uses `notifyUpdate()` for consistent state updates
   - **Critical Pattern**: Updates individual records without clearing the entire collection

4. **Hook Level (useAccount.ts):**
   - Connects SDK to store 
   - Handles data fetching, caching, and polling
   - Manages component lifecycle (mounting, visibility)
   - Returns unwrapped data to components
   - Implements memory management and cleanup
   - **Critical Pattern**: Maintains existing data during refresh operations
   - **Critical Pattern**: Returns Promises from refresh functions to enable proper loading state management

5. **Component Level (AccountDetails.tsx):**
   - Uses observer pattern to react to state changes
   - Implements `unwrapObservable()` for accessing nested observable data
   - Provides `getObservableValue()` helper with fallbacks
   - Handles rendering different data states (loading, error, success)
   - **Critical Pattern**: Shows loading indicators without hiding existing content
   - **Critical Pattern**: Maintains rows/items during refreshes (see TransactionsList)
   - **Critical Pattern**: Separates manual refresh states from background loading

### Store Structure

### Observer Pattern for Reactivity

### Data Preservation During Refreshes

A critical pattern in the OL Explorer is maintaining data visibility during refresh operations. Components should never hide existing content during a refresh cycle - users should continue to see data while new data is being fetched.

Key aspects of this pattern include:

1. **Separate Loading States**: Components must maintain three distinct loading states:
   - `isLoading`: For initial data loading (when no data is present) - shows full loading UI
   - `isRefreshing`: For background automatic refreshes - shows minimal or no indicators
   - `isManualRefreshing`: For user-initiated refreshes - shows indicator in the refresh button

2. **Manual Refresh Handling**: Components with refresh buttons must:
   - Return `Promise<void>` from refresh functions for UI state coordination
   - Track manual refresh state separately (`isManualRefreshing`) 
   - Implement prevention of duplicate refreshes
   - Properly reset all loading states in the `finally` block

3. **Loading State UI Hierarchy**:
   - Initial load → Show full loading indicators (skeleton or spinner) ONLY when no data exists
   - Background refresh → Show minimal indicators without hiding existing content
   - Manual refresh → Show spinner in the refresh button area while preserving content
   - Error → Show error state with retry option while preserving existing content

4. **Store Update Patterns**:
   - Update records without clearing entire collections
   - Never clear existing data when setting loading states
   - Preserve data during errors by not clearing on exception
   - Use careful state merging to prevent data flickering

The `TransactionsList` component demonstrates this pattern:

```typescript
// In the hook
const refresh = useCallback(async (manual = false): Promise<void> => {
  // Prevent duplicate refreshes
  if (isRefreshing) return Promise.resolve();
  
  // Set appropriate loading states
  if (manual) {
    setIsManualRefreshing(true);
  }
  setIsRefreshing(true);
  
  try {
    await fetchData();
    return Promise.resolve();
  } catch (error) {
    console.error('Error refreshing transactions:', error);
    return Promise.reject(error);
  } finally {
    // Reset loading states
    setIsRefreshing(false);
    if (manual) {
      setIsManualRefreshing(false);
    }
    // Initial loading state is only cleared after first load
    setIsLoading(false);
  }
}, [fetchData, isRefreshing]);

// In the component render
if (isLoading && (!transactions || transactions.length === 0)) {
  // Initial loading state when no data is available
  return <LoadingIndicator />;
}

// Render the component normally, preserving content during refresh
return (
  <>
    <HeaderWithRefresh 
      title="Transactions"
      isRefreshing={isManualRefreshing}
      onRefresh={handleManualRefresh}
    />
    
    {/* Note: transactions remain visible during refresh */}
    <TransactionList transactions={transactions} />
    
    {/* Subtle indicator for background refreshes */}
    {isRefreshing && !isManualRefreshing && (
      <RefreshingIndicator minimal={true} />
    )}
  </>
);
```

Implementing this pattern ensures a better user experience by preventing content flickering and maintaining context during data updates.

### Separation of Concerns

## Implementation Tasks

When working through tasks, use the following checkbox states:
- `[ ]` Task not yet started
- `[~]` Task in progress
- `[x]` Task completed

### Task 1: Extend SDK with GitHub Fetch Functionality
- [ ] (2) Identify the proper location in `useSdk.ts` to add the new method
- [ ] (6) Implement and verify SDK runtime availability
  - [ ] (3) Add runtime type checking (typeof sdk.method === 'function')
  - [ ] (4) Plan fallback mechanisms for missing SDK methods
  - [ ] (3) Add explicit return type declarations
- [ ] (4) Implement `getCommunityWalletNames()` method
  - [ ] (3) Add fetch functionality for GitHub JSON file
  - [ ] (3) Add proper error handling
  - [ ] (4) Add data validation
  - [ ] (5) Implement address normalization
  - [ ] (1) Add method to SDK return object
- [ ] (4) Implement `getAllCommunityWallets()` method
  - [ ] (3) Add blockchain integration
  - [ ] (3) Add proper error handling
  - [ ] (4) Implement address normalization
  - [ ] (1) Add method to SDK return object
- [ ] (5) Test SDK methods with mock data
  - [ ] (3) Test successful data paths
  - [ ] (3) Test error paths
  - [ ] (4) Verify runtime availability

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
  getCommunityWalletNames,
  getAllCommunityWallets
};
```

**Definition of Done:**
- [ ] Methods successfully fetch data from respective sources
- [ ] Methods properly handle network errors
- [ ] Methods validate response data structure
- [ ] Methods normalize addresses consistently
- [ ] Methods are properly exported in SDK
- [ ] Runtime type checking is implemented
- [ ] Fallback mechanisms are in place for missing methods

### Task 2: Create Community Wallet Store
- [ ] (1) Create new file `communityWalletStore.ts`
- [ ] (2) Define data staleness configuration
- [ ] (3) Define interfaces for community wallet data
- [ ] (4) Create observable store with LegendApp
- [ ] (6) Implement store actions
  - [ ] (4) Add updateWallet action that preserves existing data
  - [ ] (2) Add setLoading action
  - [ ] (2) Add setError action
  - [ ] (3) Add forceUpdate action
  - [ ] (3) Add isDataStale utility
  - [ ] (4) Add isWalletDataStale utility
- [ ] (4) Implement notifyUpdate mechanism for reactivity
- [ ] (5) Test store with mock data
  - [ ] (2) Test individual record updates
  - [ ] (3) Test data persistence during updates
  - [ ] (3) Test observable reactivity

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
  // Update a single wallet without clearing others
  updateWallet: (address: string, data: CommunityWalletData) => {
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
    return true;
  },
  
  // Set loading state (without clearing data)
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
    // Don't clear data on force update
    
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
- [ ] Data persistence during updates is verified
- [ ] Store updates don't clear entire collections
- [ ] Individual record updates work correctly

### Task 3: Create Community Wallet Hook [ ] (5)

Create a new file `src/hooks/useCommunityWallets.ts` that:
- Uses the SDK to fetch the CommunityWallet data
- Uses the store to manage the state
- Provides a clean interface for the component
- Implements proper loading state management to preserve data during refreshes

#### Subtasks:

[ ] (1) Define the hook return type interface:
```typescript
interface UseCommunityWalletsReturn {
  communityWallets: CommunityWallet[];
  isLoading: boolean;           // Initial loading only (no data available)
  isRefreshing: boolean;        // Any data refresh (background or manual)
  isManualRefreshing: boolean;  // User-initiated refresh
  error: string | null;
  refresh: (manual?: boolean) => Promise<void>;
}
```

[ ] (5) Implement the hook with data preservation during refreshes:
```typescript
export function useCommunityWallets(): UseCommunityWalletsReturn {
  const sdk = useSdk();
  const { 
    communityWallets, 
    setCommunityWallets,
    setError 
  } = useCommunityWalletStore();
  
  // Three distinct loading states for different UI treatments
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  
  const fetchData = useCallback(async () => {
    if (!sdk) return;
    
    try {
      // Verify SDK method exists at runtime (not just in type definition)
      if (typeof sdk.getCommunityWalletNames !== 'function') {
        console.error('SDK method getCommunityWalletNames not available');
        setError('SDK functionality not available');
        return;
      }
      
      // Fetch the wallet names first
      const walletNames = await sdk.getCommunityWalletNames();
      
      // This is where we would fetch additional data if needed
      // For example, fetching balances or transaction counts
      
      // Update the store - notice we don't clear existing data first
      // This ensures data remains visible during refreshes
      setCommunityWallets(walletNames);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch community wallets:', error);
      setError('Failed to fetch community wallets');
      // Important: we don't clear existing data on error
    }
  }, [sdk, setCommunityWallets, setError]);
  
  const refresh = useCallback(async (manual = false): Promise<void> => {
    // Prevent duplicate refreshes
    if (isRefreshing) return Promise.resolve();
    
    // Set appropriate loading states
    if (manual) setIsManualRefreshing(true);
    setIsRefreshing(true);
    
    try {
      await fetchData();
      return Promise.resolve();
    } catch (error) {
      console.error('Error refreshing community wallets:', error);
      return Promise.reject(error);
    } finally {
      // Reset loading states
      setIsRefreshing(false);
      if (manual) setIsManualRefreshing(false);
      // Initial loading state is only cleared after first load
      setIsLoading(false);
    }
  }, [fetchData, isRefreshing]);
  
  // Initial data load
  useEffect(() => {
    if (sdk) {
      refresh().catch(console.error);
    }
  }, [refresh, sdk]);
  
  // Auto-refresh polling
  useEffect(() => {
    if (!sdk) return;
    
    const interval = setInterval(() => {
      refresh().catch(console.error);
    }, appConfig.AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [refresh, sdk]);
  
  return {
    communityWallets,
    isLoading,
    isRefreshing,
    isManualRefreshing,
    error: useCommunityWalletStore.getState().error,
    refresh
  };
}
```

[ ] (3) Implement error handling that preserves existing data:
- Handle network errors without clearing existing data
- Provide meaningful error messages
- Support retry mechanisms

#### Definition of Done:
- Hook correctly fetches data from the SDK
- Loading states correctly differentiate between initial loading and refreshing
- Error handling preserves existing data
- Auto-refresh functionality properly implemented
- Clean API for components to consume
- SDK method availability is verified at runtime

### Task 4: Create Community Wallets Component [ ] (7)

Create a new file `src/components/CommunityWallets.tsx` that implements the UI for displaying community wallets.

#### Subtasks:

[ ] (1) Create the component file structure:
```typescript
import React, { useCallback } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useCommunityWallets } from 'src/hooks/useCommunityWallets';
import { RefreshCircle } from 'src/components/Icons';
import { formatAddress } from 'src/utils/format';
import { Row } from 'src/components/Layout';

export function CommunityWallets() {
  const { 
    communityWallets, 
    isLoading, 
    isRefreshing, 
    isManualRefreshing, 
    error, 
    refresh 
  } = useCommunityWallets();
  
  const handleRefresh = useCallback(async () => {
    try {
      await refresh(true);
    } catch (err) {
      console.error('Manual refresh failed:', err);
    }
  }, [refresh]);
  
  // Only show full loading state when no data is available
  // This preserves content visibility during refreshes
  if (isLoading && communityWallets.length === 0) {
    return (
      <View className="w-full mb-5">
        <View className="bg-secondary/90 rounded-lg overflow-hidden backdrop-blur-lg">
          <View className="h-1 bg-primary/20" />
          <Row justifyContent="between" alignItems="center" className="px-4 py-3 border-b border-border/20">
            <Text className="text-lg font-bold text-white">Community Wallets</Text>
            <ActivityIndicator size="small" color="#ffffff" />
          </Row>
          <View className="p-4 justify-center items-center">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="text-white text-base mt-2">Loading community wallets...</Text>
          </View>
        </View>
      </View>
    );
  }
  
  return (
    <View className="w-full mb-5">
      <View className="bg-secondary/90 rounded-lg overflow-hidden backdrop-blur-lg">
        <View className="h-1 bg-primary/20" />
        <Row justifyContent="between" alignItems="center" className="px-4 py-3 border-b border-border/20">
          <Text className="text-lg font-bold text-white">
            Community Wallets {communityWallets.length > 0 && `(${communityWallets.length})`}
          </Text>
          <View className="w-8 h-8 justify-center items-center">
            {isManualRefreshing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <TouchableOpacity onPress={handleRefresh} className="p-2">
                <RefreshCircle width={24} height={24} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </Row>
        
        <View className="p-4">
          {error && (
            <View className="mb-4 p-2 bg-red-900/30 rounded">
              <Text className="text-red-400">{error}</Text>
            </View>
          )}
          
          {communityWallets.length > 0 ? (
            <>
              <ScrollView className="max-h-40">
                {communityWallets.map((wallet, index) => (
                  <View 
                    key={wallet.address} 
                    className="flex-row justify-between items-center py-2 border-b border-gray-700"
                  >
                    <Text className="text-white font-medium">{wallet.name || `Wallet ${index + 1}`}</Text>
                    <Text className="text-gray-400">{formatAddress(wallet.address)}</Text>
                  </View>
                ))}
              </ScrollView>
              
              {/* Show a subtle indicator for background refreshes */}
              {isRefreshing && !isManualRefreshing && (
                <View className="items-center mt-2">
                  <Text className="text-gray-400 text-xs">Refreshing...</Text>
                </View>
              )}
            </>
          ) : (
            <View className="h-20 items-center justify-center">
              <Text className="text-gray-400">No community wallets found</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
```

[ ] (6) Implement responsive design with data preservation during refreshes:
- Maintain consistent component height during refreshes
- Implement proper loading states for different screen sizes
- Ensure content remains visible during refresh operations
- Handle the empty state gracefully

[ ] (5) Implement UI states with visibility preservation:
- Show initial loading only when no data is available
- Show error state without hiding existing content
- Show empty state when appropriate
- Show background refreshing indicator without hiding content

[ ] (4) Ensure visual consistency with other HomeScreen components:
- Use the standard card pattern with `bg-secondary/90` background and `backdrop-blur-lg`
- Include the thin colored line at the top with `h-1 bg-primary/20`
- Maintain consistent header structure with title and refresh control
- Follow the same padding and spacing as other components
- Match the loading/error/empty state patterns of existing components

#### Definition of Done:
- Component correctly renders community wallet data
- Loading, error, and empty states are properly implemented
- Component preserves content visibility during refresh operations
- Responsive design works across different screen sizes
- Component follows existing design patterns
- Visual styling matches other HomeScreen components

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
- [ ] (5) Test SDK extension with mock fetch responses
  - [ ] (2) Test method existence at runtime
  - [ ] (3) Test fallback behavior
- [ ] (4) Test store actions with mock data
  - [ ] (3) Test data persistence during updates
- [ ] (5) Test hook functionality with mock SDK
  - [ ] (4) Test data preservation during refresh
- [ ] (4) Test component rendering with mock hook data
  - [ ] (3) Test loading overlay behavior

### Integration Testing
- [ ] (6) Test data flow from SDK to component
  - [ ] (3) Verify data passes correctly from SDK to store
  - [ ] (3) Verify store updates trigger hook updates
  - [ ] (4) Verify hook data updates trigger component re-renders
- [ ] (5) Test UI responsiveness on different screen sizes
- [ ] (4) Test refresh functionality
  - [ ] (3) Verify data persistence during refresh
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
| SDK Extension | 45 minutes | None |
| Store Implementation | 1 hour | None |
| Hook Implementation | 2.5 hours | SDK Extension, Store Implementation |
| Component Creation | 1.5 hours | Hook Implementation |
| HomeScreen Integration | 30 minutes | Component Creation |
| Testing | 2 hours | All implementation tasks |
| **Total** | **8 hours** | |

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
- Preserve existing data during refreshes to avoid UI flickering

### Error Handling Strategy
- Implement fallbacks for GitHub API failures
- Handle network errors gracefully
- Provide clear error messages to users
- Implement retry mechanisms
- Check SDK method availability at runtime
- Provide alternative data paths when primary methods fail

## Final Checklist

Before considering the implementation complete, ensure:

- [ ] All tasks have been completed according to the specifications
- [ ] Code follows the existing patterns and conventions
- [ ] All tests pass
- [ ] The component renders correctly on all screen sizes
- [ ] Error handling is comprehensive including SDK method validation
- [ ] Performance is acceptable with efficient data loading and caching
- [ ] No memory leaks are present
- [ ] Content persists during refresh operations
- [ ] Documentation is complete 
- [ ] SDK method availability is verified at runtime 