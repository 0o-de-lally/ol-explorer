# OL Explorer - Change Request Template

This document provides a standardized template for requesting and implementing changes in the OL Explorer application that follow our established data flow patterns.

## Complete Data Flow Architecture Reference

All features in OL Explorer follow this consistent data flow chain:

```
SDK (@useSdk.ts) → SDK Context (@SdkContext.tsx) → Store (@*Store.ts) → Hook (@use*.ts) → Component (@*.tsx)
```

## Change Request Template

### 1. Feature/Change Description

```markdown
## Change Request: [Brief Title of Change]

### What needs to be changed
[Detailed description of what needs to be modified or added]

### Why this change is needed
[Explanation of the purpose and benefit of this change]

### Technical specifications
- Data format: [Input/output format details]
- Data source: [API endpoint, blockchain function, etc.]
- Example return values: [Example data that will be returned]
```

### 2. Required File Modifications

```markdown
### Files that need to be modified

1. SDK Layer:
   - @useSdk.ts: [Add/modify method for data fetching]
   - @SdkContext.tsx: [Update mock/stub implementations]
   - @types/blockchain.ts: [Update interfaces if needed]

2. Store Layer:
   - @store/[relevantStore].ts: [Add/modify store structures and actions]

3. Hook Layer:
   - @hooks/use[Feature].ts: [Add/modify hook for connecting SDK to store]

4. Component Layer:
   - @components/[Component].tsx or @screens/[Screen].tsx: [Update UI rendering]
```

### 3. Implementation Steps

```markdown
### Implementation Tasks

- [ ] **SDK Extension (Data Source)**
  - [ ] Add `get[Feature]Data` method to @useSdk.ts
  - [ ] Handle error cases and return appropriate defaults
  - [ ] Add method to mock implementation in @SdkContext.tsx
  - [ ] Add method signature to BlockchainSDK interface in @types/blockchain.ts

- [ ] **Store Modifications (Data Storage)**
  - [ ] Add/update interfaces for new data
  - [ ] Add/modify store action methods
  - [ ] Ensure updates preserve existing data (don't clear collections)

- [ ] **Hook Implementation (Data Connection)**
  - [ ] Create/update hook that connects SDK to store
  - [ ] Implement proper data fetching with SDK method
  - [ ] Add polling and lifecycle management
  - [ ] Implement data persistence during refresh operations

- [ ] **Component Updates (Data Display)**
  - [ ] Update component to use data from hook
  - [ ] Add loading, error, and empty states
  - [ ] Ensure data visibility during refresh operations
  - [ ] Follow existing styling patterns
```

## Implementation Examples for Each Layer

### SDK Layer Example (@useSdk.ts)

When adding a new SDK method, follow this pattern:

```typescript
// Add new method for fetching feature data
const get[Feature]Data = async (param: string): Promise<ReturnType> => {
  if (!isInitialized || !sdk) {
    console.warn('SDK not initialized, cannot get [feature] data');
    return defaultReturnValue;
  }

  try {
    const normalizedParam = normalizeParameter(param);

    const result = await sdk.view({
      function: `${OL_FRAMEWORK}::[module]::[function_name]`,
      typeArguments: [],
      arguments: [normalizedParam]
    });

    // Handle array response format - expected structure depends on the function
    if (Array.isArray(result) && result.length > 0) {
      // Process result appropriately
      return processedResult;
    }

    // Return default if unexpected format
    console.warn('Unexpected [feature] data format:', result);
    return defaultReturnValue;
  } catch (error) {
    console.error(`Error fetching [feature] data for ${param}:`, error);
    return defaultReturnValue;
  }
};

// Include the method in the return object
return {
  ...sdk,
  get[Feature]Data,
  // Other methods...
};
```

### SDK Context Mock Example (@SdkContext.tsx)

When adding a new SDK method, also add it to the mocks:

```typescript
// Add to the mock implementation
get[Feature]Data: async (param: string) => {
  console.log(`Mock get[Feature]Data called with param: ${param}`);
  return mockReturnValue; // Appropriate mock data
},

// Add to the stub implementation (used when SDK is not initialized)
get[Feature]Data: async (param: string) => {
  console.warn('SDK not initialized, cannot get [feature] data');
  return defaultReturnValue;
},
```

### Store Example (@store/featureStore.ts)

When extending a store, follow this pattern:

```typescript
// Add new data interface
export interface FeatureData {
  // Define properties
}

// Add to store interface
export interface FeatureStoreType {
  items: Record<string, {
    data: FeatureData | null;
    lastUpdated: number;
  }>;
  isLoading: boolean;
  error: string | null;
}

// Initialize store
export const featureStore = observable<FeatureStoreType>({
  items: {},
  isLoading: false,
  error: null
});

// Add store actions
export const featureActions = {
  setFeatureData: (key: string, data: FeatureData) => {
    // Initialize if doesn't exist
    if (!featureStore.items[key].peek()) {
      featureStore.items[key].set({
        data: data,
        lastUpdated: Date.now()
      });
    } else {
      // Update existing entry WITHOUT clearing other entries
      featureStore.items[key].data.set(data);
      featureStore.items[key].lastUpdated.set(Date.now());
    }
    
    // Notify update without clearing existing data
    featureStore.lastUpdated.set(Date.now());
  },
  
  // Other actions...
};
```

### Hook Example (@hooks/useFeature.ts)

When creating a hook, follow this pattern:

```typescript
export const useFeature = (param: string, isVisible = true): UseFeatureResult => {
  const sdk = useSdk();
  const { isInitialized } = useSdkContext();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get store data using observables
  const dataObservable = useObservable(featureStore.items[param]?.data);
  const isLoadingObservable = useObservable(featureStore.isLoading);
  const errorObservable = useObservable(featureStore.error);
  
  // Refs for lifecycle management
  const isMounted = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up isMounted ref
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  
  // Fetch data function
  const fetchData = async (force = false) => {
    if (!isInitialized || !sdk) return;
    
    // Skip fetch if data is fresh enough
    if (!force && !featureActions.isDataStale(param)) {
      return;
    }
    
    try {
      // Start loading WITHOUT clearing existing data
      featureActions.setLoading(true);
      
      // Check if SDK method exists at runtime
      if (typeof sdk.getFeatureData !== 'function') {
        console.warn('SDK method getFeatureData not available');
        featureActions.setError('Feature not available');
        return;
      }
      
      // Fetch data using SDK
      const result = await sdk.getFeatureData(param);
      
      if (isMounted.current) {
        // Update store WITHOUT clearing other data
        featureActions.setFeatureData(param, result);
        featureActions.setError(null);
      }
    } catch (error) {
      console.error(`Error fetching feature data for ${param}:`, error);
      
      if (isMounted.current) {
        featureActions.setError(error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      if (isMounted.current) {
        featureActions.setLoading(false);
        setIsRefreshing(false);
      }
    }
  };
  
  // Set up polling
  useEffect(() => {
    if (isVisible && isInitialized && param) {
      // Initial fetch
      fetchData();
      
      // Set up polling interval
      pollingIntervalRef.current = setInterval(() => {
        fetchData();
      }, 30000); // 30 seconds
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [isVisible, isInitialized, param]);
  
  // Public refresh function
  const refresh = async () => {
    setIsRefreshing(true);
    await fetchData(true);
  };
  
  // Helper to safely unwrap observable values
  const unwrapObservable = (value: any): any => {
    // Implementation details...
  };
  
  return {
    data: unwrapObservable(dataObservable),
    isLoading: unwrapObservable(isLoadingObservable),
    isRefreshing,
    error: unwrapObservable(errorObservable),
    refresh
  };
};
```

### Component Example (@components/FeatureComponent.tsx)

When creating or updating a component, follow this pattern:

```tsx
export const FeatureComponent = observer(({ param, isVisible = true }: FeatureComponentProps) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  // Use our custom hook
  const { data, isLoading, isRefreshing, error, refresh } = useFeature(param, isVisible);
  
  // Handle refresh button click
  const handleRefresh = () => {
    refresh();
  };
  
  // Initial loading state with no data
  if (isLoading && !data) {
    return (
      <View className="w-full mb-5">
        <View className="bg-secondary/90 rounded-lg overflow-hidden backdrop-blur-lg">
          <View className="h-1 bg-primary/20" />
          <Row justifyContent="between" alignItems="center" className="px-4 py-3 border-b border-border/20">
            <Text className="text-white font-bold text-base">
              Feature Title
            </Text>
            <ActivityIndicator size="small" color="#E75A5C" />
          </Row>

          <View className="p-4 justify-center items-center">
            <ActivityIndicator size="large" color="#E75A5C" />
            <Text className="mt-4 text-white text-base">Loading data...</Text>
          </View>
        </View>
      </View>
    );
  }
  
  // Main render for populated component
  return (
    <View className="w-full mb-5">
      <View className="bg-secondary/90 rounded-lg overflow-hidden backdrop-blur-lg">
        <View className="h-1 bg-primary/20" />
        <Row justifyContent="between" alignItems="center" className="px-4 py-3 border-b border-border/20">
          <Text className="text-white font-bold text-base">
            Feature Title
          </Text>
          <View className="w-8 h-8 justify-center items-center">
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#E75A5C" />
            ) : (
              <TouchableOpacity onPress={handleRefresh} className="p-2">
                <Ionicons name="refresh" size={16} color="#E75A5C" />
              </TouchableOpacity>
            )}
          </View>
        </Row>

        <View className="p-4">
          {error ? (
            <Text className="text-red-500 text-sm mb-4">{error}</Text>
          ) : null}
          
          {/* Always show data content if available, even during refreshing */}
          {data ? (
            <FeatureContent data={data} />
          ) : (
            <View className="py-6 items-center">
              <Text className="text-white text-base text-center">No data available</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});
```

## Common Pitfalls to Avoid

1. **Clearing Existing Data**: Never replace entire store collections during updates, always update individual items.

2. **Hiding Content During Refresh**: Don't replace content with loading indicators; show loading state alongside existing content.

3. **Not Checking SDK Methods at Runtime**: Always verify SDK methods exist at runtime before calling them.

4. **Skipping Layers**: Don't skip layers in the data flow; always pass data through the complete chain.

5. **Reusing Component Styles Inconsistently**: Maintain the same card structure, header layout, and refresh button positioning.

6. **Not Handling Component Lifecycle**: Always use isMounted ref to prevent updates after unmount.

7. **Ignoring Edge Cases**: Always handle loading, error, and empty states properly.

8. **Not Using Normalization Functions**: Use address normalization and other data preparation utilities consistently.

## Change Request Submission Checklist

- [ ] Identified all files that need to be modified
- [ ] Specified exact function/method names
- [ ] Included input/output data formats
- [ ] Provided example data
- [ ] Described UI requirements
- [ ] Referenced existing patterns to follow
- [ ] Outlined error handling approach
- [ ] Considered data persistence during refresh

By following this template, we ensure all modifications to the OL Explorer maintain the established data flow patterns and code quality standards. 