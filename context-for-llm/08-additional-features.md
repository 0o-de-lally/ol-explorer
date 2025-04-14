# OL Explorer - Feature Extension Guide

This document provides comprehensive guidance for extending the OL Explorer blockchain explorer project with new features, ensuring that additions maintain code quality, test coverage, and adhere to project architecture.

## Standard Data Flow Architecture

The OL Explorer follows a consistent data flow pattern that should be maintained for all new features:

```
SDK → SDK Context → LegendApp Store → Hooks → Unwrap State → Component → View
```

This architecture promotes:
- Separation of concerns
- Consistent state management
- Efficient data fetching and caching
- Proper memory management
- Reactive UI updates

## Feature Development Process

### 1. Planning Phase

Before writing any code, follow these planning steps:

1. **Feature Specification**:
   - Document the feature's purpose and requirements
   - Define acceptance criteria
   - Identify potential edge cases
   - Specify UI/UX requirements

2. **Architecture Review**:
   - Identify affected components
   - Evaluate changes to existing code
   - Consider performance implications
   - Plan state management approach
   - Ensure alignment with existing data flow patterns

3. **Task Breakdown**:
   - Break the feature into smaller, manageable tasks following the data flow:
     1. SDK Extension (adding methods to useSdk.ts)
     2. Store Implementation (creating or extending an observable store)
     3. Hook Implementation (connecting SDK to store)
     4. Component Creation (rendering the UI)
     5. Integration (adding component to screens)
   - Further break down complex tasks (difficulty > 5) into subtasks
   - Assign difficulty ratings (1-10) for each task and subtask
   - Prioritize tasks
   - Estimate effort required
   - Identify dependencies between tasks

### 2. Implementation Phase

Follow these steps during implementation:

1. **Branch Creation**:
   ```bash
   # Create a feature branch from main
   git checkout -b feature/feature-name
   ```

2. **Type Definitions**:
   - Add TypeScript interfaces for new data structures
   - Extend existing types as needed
   - Locate type definitions in `src/types/` directory

3. **SDK Extension**:
   - Add new methods to `src/hooks/useSdk.ts`
   - Follow error handling patterns from existing methods
   - Add proper address normalization if working with addresses
   - Use Promise.allSettled for handling multiple parallel API calls

   Example based on existing useSdk.ts pattern:
   ```typescript
   // Adding a new method to useSdk.ts
   const getNewFeatureData = async (param: string): Promise<ResultType> => {
     if (!isInitialized || !sdk) {
       console.warn('SDK not initialized, cannot get new feature data');
       return defaultReturnValue;
     }

     try {
       const normalizedParam = normalizeParameter(param);
       
       const result = await sdk.view({
         function: `${OL_FRAMEWORK}::module::function_name`,
         typeArguments: [],
         arguments: [normalizedParam]
       });
       
       // Handle different response formats
       if (Array.isArray(result) && result.length > 0) {
         return processResult(result[0]);
       }
       
       return processResult(result);
     } catch (error) {
       console.error(`Error fetching new feature data for ${param}:`, error);
       return defaultReturnValue;
     }
   };
   
   // Add to return object
   return {
     ...sdk,
     // Existing methods
     getNewFeatureData
   };
   ```

4. **Store Implementation**:
   - Create a new store file in `src/store/` or extend an existing one
   - Use `observable` from '@legendapp/state'
   - Implement a record-based structure for data when appropriate
   - Add store actions for state manipulation
   - Implement notifyUpdate mechanism for UI reactivity
   - Add data staleness checks

   Example based on existing store patterns:
   ```typescript
   // src/store/newFeatureStore.ts
   import { observable } from '@legendapp/state';
   import appConfig from '../config/appConfig';

   // Config for data freshness
   export const NEW_FEATURE_CONFIG = {
     MIN_FRESHNESS_MS: 30000, // 30 seconds
     REFRESH_INTERVAL_MS: 60000 // 1 minute
   };

   // Define data interface
   export interface NewFeatureData {
     id: string;
     value: string;
     timestamp: number;
   }

   // Define store structure
   export interface NewFeatureStoreType {
     items: Record<string, {
       data: NewFeatureData | null;
       lastUpdated: number;
     }>;
     isLoading: boolean;
     error: string | null;
     lastUpdated: number;
   }

   // Initialize store with defaults
   export const newFeatureStore = observable<NewFeatureStoreType>({
     items: {},
     isLoading: false,
     error: null,
     lastUpdated: 0
   });

   // Function to notify UI updates
   const notifyUpdate = () => {
     // Update lastUpdated timestamp to trigger reactivity
     newFeatureStore.set(prev => ({
       ...prev,
       lastUpdated: Date.now()
     }));
     
     // Dispatch event for components
     if (typeof window !== 'undefined') {
       const event = new CustomEvent('new-feature-updated', {
         detail: { timestamp: Date.now() }
       });
       window.dispatchEvent(event);
     }
   };

   // Store actions
   export const newFeatureActions = {
     setItem: (id: string, data: NewFeatureData) => {
       // Initialize if doesn't exist
       if (!newFeatureStore.items[id].peek()) {
         newFeatureStore.items[id].set({
           data: data,
           lastUpdated: Date.now()
         });
       } else {
         // Update existing entry
         newFeatureStore.items[id].data.set(data);
         newFeatureStore.items[id].lastUpdated.set(Date.now());
       }
       
       notifyUpdate();
     },
     
     setLoading: (isLoading: boolean) => {
       newFeatureStore.isLoading.set(isLoading);
       notifyUpdate();
     },
     
     setError: (error: string | null) => {
       newFeatureStore.error.set(error);
       notifyUpdate();
     },
     
     isDataStale: (id?: string): boolean => {
       if (id) {
         const item = newFeatureStore.items[id].peek();
         if (!item) return true;
         
         const now = Date.now();
         return now - item.lastUpdated > NEW_FEATURE_CONFIG.MIN_FRESHNESS_MS;
       }
       
       // Check global staleness
       const lastUpdated = newFeatureStore.lastUpdated.peek();
       const now = Date.now();
       return now - lastUpdated > NEW_FEATURE_CONFIG.MIN_FRESHNESS_MS;
     },
     
     forceUpdate: () => {
       newFeatureStore.isLoading.set(true);
       notifyUpdate();
       
       setTimeout(() => {
         newFeatureStore.isLoading.set(false);
         notifyUpdate();
       }, 50);
       
       return true;
     }
   };
   ```

5. **Hook Implementation**:
   - Create a new hook file in `src/hooks/`
   - Connect SDK methods to store actions
   - Implement proper component lifecycle management
   - Use AppState for handling app foreground/background
   - Add polling mechanism
   - Handle errors gracefully
   - Use Promise.allSettled for parallel data fetching
   - Add memory management with isMounted ref

   Example based on existing hook patterns:
   ```typescript
   // src/hooks/useNewFeature.ts
   import { useEffect, useRef, useState } from 'react';
   import { AppState, AppStateStatus } from 'react-native';
   import { useObservable } from '@legendapp/state/react';
   import { useSdk } from './useSdk';
   import { useSdkContext } from '../context/SdkContext';
   import { newFeatureStore, newFeatureActions, NewFeatureData } from '../store/newFeatureStore';
   import { NEW_FEATURE_CONFIG } from '../store/newFeatureStore';

   interface UseNewFeatureResult {
     data: NewFeatureData | null;
     isLoading: boolean;
     error: string | null;
     refresh: (force?: boolean) => Promise<void>;
     isStale: boolean;
   }

   export const useNewFeature = (id: string, isVisible = true): UseNewFeatureResult => {
     const sdk = useSdk();
     const { isInitialized } = useSdkContext();
     const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
     const [fetchRequested, setFetchRequested] = useState(false);
     const isStale = newFeatureActions.isDataStale(id);
     
     // Get store data using observables
     const itemObservable = useObservable(id ? newFeatureStore.items[id]?.data : null);
     const isLoadingObservable = useObservable(newFeatureStore.isLoading);
     const errorObservable = useObservable(newFeatureStore.error);
     
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
         if (isVisible && isMounted.current && id) {
           fetchData(true);
         }
       }
       appState.current = nextAppState;
     };
     
     // Set up polling based on visibility
     useEffect(() => {
       if (isVisible && isInitialized && id) {
         startPolling();
         // Initial fetch
         fetchData();
       } else {
         stopPolling();
       }
       
       return () => {
         stopPolling();
       };
     }, [isVisible, isInitialized, id]);
     
     const startPolling = () => {
       if (!pollingIntervalRef.current && isVisible) {
         pollingIntervalRef.current = setInterval(() => {
           if (!isAutoRefreshing && !fetchRequested && isVisible && isMounted.current && id) {
             fetchData();
           }
         }, NEW_FEATURE_CONFIG.REFRESH_INTERVAL_MS);
       }
     };
     
     const stopPolling = () => {
       if (pollingIntervalRef.current) {
         clearInterval(pollingIntervalRef.current);
         pollingIntervalRef.current = null;
       }
     };
     
     const fetchData = async (force = false) => {
       // Skip if already fetching
       if (fetchRequested) return;
       
       // Skip fetch if data is fresh enough and force is false
       if (!force && !newFeatureActions.isDataStale(id)) {
         return;
       }
       
       try {
         if (isMounted.current) {
           setIsAutoRefreshing(true);
           setFetchRequested(true);
           newFeatureActions.setLoading(true);
         }
         
         const result = await sdk.getNewFeatureData(id);
         
         if (isMounted.current) {
           if (result) {
             newFeatureActions.setItem(id, result);
           }
           newFeatureActions.setError(null);
         }
       } catch (error) {
         console.error(`Error fetching data for ${id}:`, error);
         
         if (isMounted.current) {
           newFeatureActions.setError(
             error instanceof Error ? error.message : 'Unknown error occurred'
           );
         }
       } finally {
         if (isMounted.current) {
           newFeatureActions.setLoading(false);
           setFetchRequested(false);
           
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
       await fetchData(force);
     };
     
     return {
       data: itemObservable?.get ? itemObservable.get() : null,
       isLoading: isLoadingObservable?.get ? Boolean(isLoadingObservable.get()) : false,
       error: errorObservable?.get ? String(errorObservable.get()) : null,
       refresh,
       isStale
     };
   };
   ```

6. **Component Implementation**:
   - Create new component in `src/components/`
   - Use LegendApp's observer pattern
   - Implement unwrapObservable function for safe access to observables
   - Add responsive design with useWindowDimensions
   - Include loading, error, and empty states
   - Use consistent styling with NativeWind classes

   Example based on existing component patterns:
   ```tsx
   // src/components/NewFeatureComponent.tsx
   import React, { useState } from 'react';
   import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
   import { observer } from '@legendapp/state/react';
   import { useNewFeature } from '../hooks/useNewFeature';
   import { Card, Row, Column } from '../components/Layout';

   // Helper to unwrap observable values recursively
   const unwrapObservable = (value: any): any => {
     try {
       // Handle undefined/null
       if (value === undefined || value === null) {
         return value;
       }

       // Handle observable with get method (LegendState observable)
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

   // Helper function to safely get values from observables
   const getObservableValue = <T,>(value: any, defaultValue: T): T => {
     return unwrapObservable(value) ?? defaultValue;
   };

   type NewFeatureComponentProps = {
     id: string;
     isVisible?: boolean;
   };

   export const NewFeatureComponent = observer(({ id, isVisible = true }: NewFeatureComponentProps) => {
     const { width } = useWindowDimensions();
     const isDesktop = width >= 768;
     
     // Use our custom hook
     const { data, isLoading, error, refresh, isStale } = useNewFeature(id, isVisible);
     
     const handleRefresh = () => {
       refresh(true);
     };
     
     return (
       <View className="w-full mb-5">
         <Card>
           <View className="h-1 bg-primary/20" />
           <Row justifyContent="between" alignItems="center" className="px-4 py-3 border-b border-border/20">
             <Text className="text-white font-bold text-base">
               Feature Details
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
             {isLoading && !data && (
               <View className="py-4 items-center">
                 <ActivityIndicator size="large" color="#E75A5C" />
                 <Text className="text-white text-base mt-2">Loading data...</Text>
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
             
             {/* Data display */}
             {!isLoading && !error && data && (
               <View>
                 <Row className="mb-4">
                   <Column className="flex-1">
                     <Text className="text-text-muted text-sm mb-1">ID</Text>
                     <Text className="text-text-light text-base">{getObservableValue(data.id, '')}</Text>
                   </Column>
                   <Column className="flex-1">
                     <Text className="text-text-muted text-sm mb-1">Value</Text>
                     <Text className="text-text-light text-base">{getObservableValue(data.value, '')}</Text>
                   </Column>
                 </Row>
                 
                 <Text className="text-text-muted text-sm mb-1">Timestamp</Text>
                 <Text className="text-text-light text-base">
                   {new Date(getObservableValue(data.timestamp, 0)).toLocaleString()}
                 </Text>
               </View>
             )}
             
             {/* Empty state */}
             {!isLoading && !error && !data && (
               <View className="py-6 items-center">
                 <Text className="text-white text-base text-center">
                   No data found
                 </Text>
               </View>
             )}
           </View>
         </Card>
       </View>
     );
   });
   ```

7. **Screen Integration**:
   - Add new component to appropriate screen
   - Pass required props
   - Consider screen visibility for data fetching

   Example based on existing patterns:
   ```tsx
   // In src/screens/HomeScreen.tsx

   // Add import
   import { NewFeatureComponent } from '../components/NewFeatureComponent';

   // In the render section
   <Grid cols={1} gap={6} fullBleed={true} className="mb-4">
     {/* Existing components */}
     <BlockchainMetrics />
     <SupplyStats isVisible={isScreenVisible} />
     
     {/* New feature component */}
     <NewFeatureComponent id="feature-id" isVisible={isScreenVisible} />

     {/* Other components */}
     <TransactionsList
       testID="transactions-list"
       onRefresh={handleRefresh}
       initialLimit={appConfig.transactions.defaultLimit}
       onLimitChange={handleLimitChange}
     />
   </Grid>
   ```

### 3. Testing Phase

Implement comprehensive tests for the new feature, following established patterns:

1. **Unit Testing**:
   - Test SDK extension methods
     - Test successful data fetching
     - Test error handling
     - Test data normalization
   - Test store actions
     - Test state updates
     - Test data staleness checks
   - Test hook functionality with mocked SDK
     - Test fetching logic
     - Test polling behavior
     - Test app state change handling

   Example based on existing testing patterns:
   ```typescript
   // src/tests/hooks/useNewFeature.test.ts
   import { renderHook, act } from '@testing-library/react-hooks';
   import { useNewFeature } from '../../hooks/useNewFeature';
   import { useSdk } from '../../hooks/useSdk';
   import { newFeatureStore, newFeatureActions } from '../../store/newFeatureStore';

   // Mock dependencies
   jest.mock('../../hooks/useSdk', () => ({
     useSdk: jest.fn()
   }));

   jest.mock('../../context/SdkContext', () => ({
     useSdkContext: () => ({
       isInitialized: true
     })
   }));

   jest.mock('react-native', () => ({
     AppState: {
       currentState: 'active',
       addEventListener: jest.fn(() => ({
         remove: jest.fn()
       }))
     }
   }));

   describe('useNewFeature', () => {
     beforeEach(() => {
       jest.clearAllMocks();
       
       // Reset store
       newFeatureActions.setLoading(false);
       newFeatureActions.setError(null);
     });

     it('should fetch data successfully', async () => {
       const mockData = { id: 'test-id', value: 'test-value', timestamp: 123456789 };
       
       // Mock SDK method
       (useSdk as jest.Mock).mockReturnValue({
         getNewFeatureData: jest.fn().mockResolvedValue(mockData)
       });

       const { result, waitForNextUpdate } = renderHook(() => useNewFeature('test-id', true));
       
       // Should start loading
       expect(result.current.isLoading).toBe(true);
       
       await waitForNextUpdate();
       
       // Should finish loading with data
       expect(result.current.isLoading).toBe(false);
       expect(result.current.data).toEqual(mockData);
       expect(result.current.error).toBeNull();
     });

     it('should handle errors', async () => {
       const mockError = new Error('Test error');
       
       // Mock SDK method to throw error
       (useSdk as jest.Mock).mockReturnValue({
         getNewFeatureData: jest.fn().mockRejectedValue(mockError)
       });

       const { result, waitForNextUpdate } = renderHook(() => useNewFeature('test-id', true));
       
       // Should start loading
       expect(result.current.isLoading).toBe(true);
       
       await waitForNextUpdate();
       
       // Should finish loading with error
       expect(result.current.isLoading).toBe(false);
       expect(result.current.data).toBeNull();
       expect(result.current.error).toEqual('Test error');
     });

     it('should not fetch if not visible', async () => {
       const mockFn = jest.fn();
       (useSdk as jest.Mock).mockReturnValue({
         getNewFeatureData: mockFn
       });

       renderHook(() => useNewFeature('test-id', false));
       
       // Should not call SDK method
       expect(mockFn).not.toHaveBeenCalled();
     });

     it('should refresh data when called', async () => {
       const mockData = { id: 'test-id', value: 'test-value', timestamp: 123456789 };
       const mockFn = jest.fn().mockResolvedValue(mockData);
       
       (useSdk as jest.Mock).mockReturnValue({
         getNewFeatureData: mockFn
       });

       const { result, waitForNextUpdate } = renderHook(() => useNewFeature('test-id', true));
       
       await waitForNextUpdate();
       
       // First call completes
       expect(mockFn).toHaveBeenCalledTimes(1);
       
       // Trigger refresh
       act(() => {
         result.current.refresh(true);
       });
       
       // Should call SDK method again
       expect(mockFn).toHaveBeenCalledTimes(2);
     });
   });
   ```

2. **Component Testing**:
   - Test component rendering
   - Test loading/error/empty states
   - Test user interactions

   Example based on existing component testing patterns:
   ```tsx
   // src/tests/components/NewFeatureComponent.test.tsx
   import React from 'react';
   import { render, screen, fireEvent } from '@testing-library/react-native';
   import { NewFeatureComponent } from '../../components/NewFeatureComponent';
   import { useNewFeature } from '../../hooks/useNewFeature';

   // Mock the hook
   jest.mock('../../hooks/useNewFeature', () => ({
     useNewFeature: jest.fn()
   }));

   describe('NewFeatureComponent', () => {
     // Mock refresh function
     const mockRefresh = jest.fn();
     
     beforeEach(() => {
       jest.clearAllMocks();
     });
     
     it('renders loading state', () => {
       // Mock loading state
       (useNewFeature as jest.Mock).mockReturnValue({
         data: null,
         isLoading: true,
         error: null,
         refresh: mockRefresh,
         isStale: false
       });
       
       render(<NewFeatureComponent id="test-id" />);
       
       // Check for loading indicator
       expect(screen.getByText('Loading data...')).toBeTruthy();
     });
     
     it('renders error state', () => {
       // Mock error state
       (useNewFeature as jest.Mock).mockReturnValue({
         data: null,
         isLoading: false,
         error: 'Test error',
         refresh: mockRefresh,
         isStale: false
       });
       
       render(<NewFeatureComponent id="test-id" />);
       
       // Check for error message
       expect(screen.getByText('Error: Test error')).toBeTruthy();
     });
     
     it('renders data correctly', () => {
       // Mock data state
       (useNewFeature as jest.Mock).mockReturnValue({
         data: {
           id: 'test-id',
           value: 'test-value',
           timestamp: 1625097600000 // July 1, 2021
         },
         isLoading: false,
         error: null,
         refresh: mockRefresh,
         isStale: false
       });
       
       render(<NewFeatureComponent id="test-id" />);
       
       // Check for data elements
       expect(screen.getByText('test-id')).toBeTruthy();
       expect(screen.getByText('test-value')).toBeTruthy();
     });
     
     it('calls refresh when button clicked', () => {
       // Mock data state with refresh function
       (useNewFeature as jest.Mock).mockReturnValue({
         data: {
           id: 'test-id',
           value: 'test-value',
           timestamp: 1625097600000
         },
         isLoading: false,
         error: null,
         refresh: mockRefresh,
         isStale: false
       });
       
       render(<NewFeatureComponent id="test-id" />);
       
       // Find and click refresh button
       const refreshButton = screen.getByText('Refresh');
       fireEvent.press(refreshButton);
       
       // Check if refresh was called
       expect(mockRefresh).toHaveBeenCalledWith(true);
     });
   });
   ```

3. **Integration Testing**:
   - Test data flow through the entire feature pipeline
   - Test component integration in screens
   - Test interactions with other components

4. **End-to-End Testing**:
   - Test feature with real blockchain data
   - Verify UI behavior in different states
   - Verify polling behavior during app lifecycle changes

### 4. Documentation Phase

1. **Code Documentation**:
   - Add JSDoc comments to functions and components
   - Document complex logic
   - Update type definitions

2. **Feature Documentation**:
   - Update README.md with feature description
   - Add usage examples
   - Document any configuration options

3. **Update Context Documentation**:
   - Add feature details to appropriate context documents
   - Update test summary with new test coverage
   - Add comprehensive task list with difficulty ratings for future reference

### 5. Review and Merge

1. **Pull Request**:
   ```bash
   # Push feature branch to remote
   git push -u origin feature/feature-name

   # Create a pull request on GitHub
   ```

2. **Code Review**:
   - Address review comments
   - Fix any linting issues
   - Ensure all tests pass

3. **Merge**:
   - Squash commits if needed
   - Merge into main branch
   - Delete feature branch after successful merge

## Task Breakdown Methodology

Breaking down complex tasks is essential for successful implementation. Follow these guidelines:

1. **Use Difficulty Ratings**:
   - Assign a difficulty rating (1-10) to every task and subtask
   - Tasks with difficulty > 5 should be broken down further
   - Balance task difficulty across team members

2. **Task Types by Data Flow Layer**:
   - **SDK Extension Tasks**:
     - API integration
     - Data normalization
     - Error handling
   - **Store Tasks**:
     - State structure design
     - Action implementations
     - Update mechanisms
   - **Hook Tasks**:
     - Data fetching logic
     - Lifecycle management
     - Polling implementation
   - **Component Tasks**:
     - UI state handling
     - Responsive design
     - User interaction

3. **Measurable Subtasks**:
   - Break implementation into clear, measurable steps
   - Include specific code edits for each subtask
   - Create "Definition of Done" criteria for each task

Example of proper task breakdown:
```
Task: Implement Hook
  Subtasks:
  - [ ] (1) Create hook file structure
  - [ ] (3) Define return type interface
  - [ ] (4) Implement SDK and store connections
  - [ ] (4) Add state management for lifecycle
    - [ ] (2) Set up isMounted ref
    - [ ] (3) Add useEffect for initialization
    - [ ] (3) Implement AppState listener
  - [ ] (5) Implement data fetching
    - [ ] (3) Add fetch method with force refresh
    - [ ] (4) Implement error handling
    - [ ] (3) Add data transformation
  - [ ] (4) Add polling mechanism
    - [ ] (3) Implement interval management
    - [ ] (4) Handle visibility changes
  - [ ] (3) Add memory management
    - [ ] (2) Clear intervals on unmount
    - [ ] (2) Remove event listeners
    - [ ] (3) Prevent state updates after unmount
```

When working through tasks, use the following checkbox states:
- `[ ]` Task not yet started
- `[~]` Task in progress
- `[x]` Task completed

Note that any task with a difficulty rating greater than 5 should be broken down into smaller subtasks to make implementation more manageable.

## Observable State Management

The OL Explorer uses LegendApp for observable state management. Follow these patterns:

1. **Store Structure**:
   - Use record-based structure for collections (key-value objects)
   - Separate loading, error, and data states
   - Track timestamps for data freshness

2. **Observable Unwrapping**:
   - Always implement the `unwrapObservable` function in components
   - Use `getObservableValue` helper with fallbacks
   - Handle nested observables recursively

3. **Performance Optimization**:
   - Use `peek()` for reads that shouldn't trigger reactivity
   - Use batched updates when changing multiple values
   - Implement data staleness checks to prevent unnecessary fetches

## Memory Management

Proper memory management is critical for React Native apps:

1. **Component Lifecycle**:
   - Track mount state with `isMounted.current = true/false`
   - Check mount state before setting state
   - Clear all timers and listeners on unmount

2. **Preventing Memory Leaks**:
   - Use AbortController for cancellable fetch requests
   - Remove event listeners in cleanup functions
   - Clear setInterval/setTimeout in useEffect cleanup

3. **AppState Handling**:
   - Re-fetch data when app comes to foreground
   - Pause polling when app is in background
   - Track app state with ref to avoid unnecessary re-renders

## Error Handling Strategy

Implement consistent error handling throughout the app:

1. **SDK Layer**:
   - Use try/catch for all async operations
   - Log errors with descriptive messages
   - Return fallback values instead of throwing errors

2. **Hook Layer**:
   - Propagate errors to store
   - Show appropriate UI feedback
   - Implement retry mechanisms

3. **Component Layer**:
   - Display user-friendly error messages
   - Provide retry options
   - Gracefully degrade functionality

## Conclusion

By following this comprehensive feature extension guide, you can successfully add new functionality to the OL Explorer project while maintaining code quality, test coverage, and adherence to the established architecture. The guide ensures consistent implementation across all layers of the application, from SDK methods to UI components.

Always refer to existing implementations in the codebase for examples of these patterns in action. The AccountDetails and BlockchainMetrics components provide excellent reference implementations of the complete data flow pattern. 