# OL Explorer - Feature Extension Guide

This document provides comprehensive guidance for extending the OL Explorer blockchain explorer project with new features, ensuring that additions maintain code quality, test coverage, and adhere to project architecture.

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

3. **Task Breakdown**:
   - Break the feature into smaller, manageable tasks
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

3. **Store Enhancements**:
   - Add new state in the appropriate store file (e.g., `src/store/blockchainStore.ts`)
   - Implement actions for state manipulation
   - Follow the patterns established in existing stores

   Example of adding to a store:
   ```typescript
   // Example: Adding a new feature to blockchainStore.ts
   import { observable } from '@legendapp/state';

   // Extend existing store
   export const blockchainStore = {
     // ... existing store properties
     newFeature: observable({
       data: null,
       isLoading: false,
       error: null
     })
   };

   // Add actions for the new feature
   export const blockchainActions = {
     // ... existing actions
     setNewFeatureData: (data) => {
       blockchainStore.newFeature.data.set(data);
     },
     setNewFeatureLoading: (isLoading) => {
       blockchainStore.newFeature.isLoading.set(isLoading);
     },
     setNewFeatureError: (error) => {
       blockchainStore.newFeature.error.set(error);
     }
   };
   ```

4. **SDK Integration**:
   - Add new SDK functions or extend existing ones in `src/hooks/useSdk.ts`
   - Ensure proper error handling
   - Document parameters and return types

   Example of extending SDK integration:
   ```typescript
   // Example: Adding a new SDK function
   export const useSdk = () => {
     const { sdk } = useSdkContext();
     
     // ... existing functions
     
     const newFeatureFunction = async (param1: string, param2: number): Promise<NewFeatureType> => {
       try {
         const result = await sdk.callNewFeatureEndpoint(param1, param2);
         return result;
       } catch (error) {
         console.error('Error calling new feature endpoint:', error);
         throw error;
       }
     };
     
     return {
       // ... existing return values
       newFeatureFunction
     };
   };
   ```

5. **Component Development**:
   - Create new components in `src/components/`
   - Ensure responsive design
   - Use NativeWind for consistent styling
   - Follow existing component patterns

   Example of a new component:
   ```tsx
   // Example: src/components/NewFeatureComponent.tsx
   import React from 'react';
   import { View, Text } from 'react-native';
   import { useObservable } from '@legendapp/state/react';
   import { blockchainStore } from '../store/blockchainStore';

   export const NewFeatureComponent: React.FC = () => {
     const data = useObservable(blockchainStore.newFeature.data);
     const isLoading = useObservable(blockchainStore.newFeature.isLoading);
     const error = useObservable(blockchainStore.newFeature.error);
     
     if (isLoading) {
       return (
         <View className="p-4">
           <Text className="text-white">Loading...</Text>
         </View>
       );
     }
     
     if (error) {
       return (
         <View className="p-4">
           <Text className="text-red-500">Error: {error.message}</Text>
         </View>
       );
     }
     
     return (
       <View className="p-4 bg-gray-800 rounded-lg">
         <Text className="text-white text-lg font-bold">New Feature</Text>
         {data && (
           <Text className="text-white mt-2">{JSON.stringify(data)}</Text>
         )}
       </View>
     );
   };
   ```

6. **Screen Integration**:
   - Add new screens in `src/screens/` or modify existing ones
   - Integrate new components
   - Implement navigation logic

7. **Routing Updates**:
   - Update or add route definitions in `app` directory
   - Ensure proper parameter passing
   - Implement deep linking support if needed

   Example of adding a new route:
   ```tsx
   // Example: app/new-feature/[id].tsx
   import React from 'react';
   import { useLocalSearchParams } from 'expo-router';
   import { NewFeatureScreen } from '../../src/screens/NewFeatureScreen';

   export default function NewFeaturePage() {
     const { id } = useLocalSearchParams();
     return <NewFeatureScreen id={id as string} />;
   }
   ```

### 3. Testing Phase

Implement comprehensive tests for the new feature:

1. **Unit Tests**:
   - Add tests for new functions and hooks
   - Test store actions and state updates
   - Place tests in `src/tests/` directory

   Example of a unit test:
   ```tsx
   // Example: src/tests/hooks/useNewFeature.test.tsx
   import { renderHook, act } from '@testing-library/react-hooks';
   import { useNewFeature } from '../../hooks/useNewFeature';
   import { useSdk } from '../../hooks/useSdk';

   // Mock dependencies
   jest.mock('../../hooks/useSdk', () => ({
     useSdk: jest.fn()
   }));

   describe('useNewFeature', () => {
     beforeEach(() => {
       jest.clearAllMocks();
     });

     it('should fetch data successfully', async () => {
       const mockData = { id: '123', value: 'test' };
       (useSdk as jest.Mock).mockReturnValue({
         newFeatureFunction: jest.fn().mockResolvedValue(mockData)
       });

       const { result, waitForNextUpdate } = renderHook(() => useNewFeature());
       
       act(() => {
         result.current.fetchData('123');
       });
       
       expect(result.current.isLoading).toBe(true);
       
       await waitForNextUpdate();
       
       expect(result.current.isLoading).toBe(false);
       expect(result.current.data).toEqual(mockData);
       expect(result.current.error).toBeNull();
     });

     it('should handle errors', async () => {
       const mockError = new Error('Test error');
       (useSdk as jest.Mock).mockReturnValue({
         newFeatureFunction: jest.fn().mockRejectedValue(mockError)
       });

       const { result, waitForNextUpdate } = renderHook(() => useNewFeature());
       
       act(() => {
         result.current.fetchData('123');
       });
       
       await waitForNextUpdate();
       
       expect(result.current.isLoading).toBe(false);
       expect(result.current.data).toBeNull();
       expect(result.current.error).toBe(mockError);
     });
   });
   ```

2. **Component Tests**:
   - Test component rendering and interactions
   - Test different states (loading, error, success)

   Example of a component test:
   ```tsx
   // Example: src/tests/components/NewFeatureComponent.test.tsx
   import React from 'react';
   import { render, screen } from '@testing-library/react-native';
   import { NewFeatureComponent } from '../../components/NewFeatureComponent';
   import { blockchainStore } from '../../store/blockchainStore';

   jest.mock('@legendapp/state/react', () => ({
     useObservable: jest.fn(selector => {
       if (selector === blockchainStore.newFeature.isLoading) return false;
       if (selector === blockchainStore.newFeature.error) return null;
       if (selector === blockchainStore.newFeature.data) return { id: '123', value: 'test' };
       return undefined;
     })
   }));

   describe('NewFeatureComponent', () => {
     it('renders data correctly', () => {
       render(<NewFeatureComponent />);
       
       expect(screen.getByText('New Feature')).toBeTruthy();
       expect(screen.getByText(/"id":"123"/)).toBeTruthy();
     });
     
     // Add more tests for loading and error states
   });
   ```

3. **End-to-End Tests**:
   - Add Cypress tests for key user flows
   - Test integration with other features

   Example of a Cypress test:
   ```javascript
   // Example: cypress/e2e/new-feature.cy.js
   describe('New Feature', () => {
     beforeEach(() => {
       cy.visit('/new-feature/123');
     });

     it('displays new feature data correctly', () => {
       cy.get('[data-testid="new-feature-title"]').should('contain', 'New Feature');
       cy.get('[data-testid="new-feature-data"]').should('be.visible');
     });

     it('navigates back to home', () => {
       cy.get('[data-testid="back-button"]').click();
       cy.url().should('eq', Cypress.config().baseUrl + '/');
     });
   });
   ```

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

## Common Extension Patterns

### Adding a New Data Type

1. **Define types**:
   ```typescript
   // src/types/newFeature.ts
   export interface NewFeatureType {
     id: string;
     name: string;
     value: number;
     timestamp: number;
   }
   ```

2. **Add to store**:
   ```typescript
   // src/store/newFeatureStore.ts
   import { observable } from '@legendapp/state';
   import { NewFeatureType } from '../types/newFeature';

   export const newFeatureStore = observable({
     items: {} as Record<string, NewFeatureType>,
     selectedId: null as string | null,
     isLoading: false,
     error: null as Error | null
   });

   export const newFeatureActions = {
     setItems: (items: Record<string, NewFeatureType>) => {
       newFeatureStore.items.set(items);
     },
     setSelectedId: (id: string | null) => {
       newFeatureStore.selectedId.set(id);
     },
     setLoading: (isLoading: boolean) => {
       newFeatureStore.isLoading.set(isLoading);
     },
     setError: (error: Error | null) => {
       newFeatureStore.error.set(error);
     }
   };
   ```

3. **Create hooks**:
   ```typescript
   // src/hooks/useNewFeature.ts
   import { useCallback, useEffect } from 'react';
   import { useObservable } from '@legendapp/state/react';
   import { useSdk } from './useSdk';
   import { newFeatureStore, newFeatureActions } from '../store/newFeatureStore';

   export const useNewFeature = (id?: string) => {
     const sdk = useSdk();
     const items = useObservable(newFeatureStore.items);
     const selectedId = useObservable(newFeatureStore.selectedId);
     const isLoading = useObservable(newFeatureStore.isLoading);
     const error = useObservable(newFeatureStore.error);

     const fetchData = useCallback(async () => {
       if (!id) return;
       
       newFeatureActions.setLoading(true);
       newFeatureActions.setError(null);
       
       try {
         const data = await sdk.getNewFeature(id);
         newFeatureActions.setItems({ ...items, [id]: data });
         newFeatureActions.setSelectedId(id);
       } catch (err) {
         newFeatureActions.setError(err instanceof Error ? err : new Error(String(err)));
       } finally {
         newFeatureActions.setLoading(false);
       }
     }, [id, sdk, items]);

     useEffect(() => {
       if (id) {
         fetchData();
       }
     }, [id, fetchData]);

     return {
       data: id ? items[id] : null,
       isLoading,
       error,
       fetchData
     };
   };
   ```

### Adding a New Screen

1. **Create screen component**:
   ```tsx
   // src/screens/NewFeatureScreen.tsx
   import React from 'react';
   import { View, Text, ScrollView } from 'react-native';
   import { useNewFeature } from '../hooks/useNewFeature';
   import { NewFeatureComponent } from '../components/NewFeatureComponent';

   export interface NewFeatureScreenProps {
     id: string;
   }

   export const NewFeatureScreen: React.FC<NewFeatureScreenProps> = ({ id }) => {
     const { data, isLoading, error } = useNewFeature(id);

     if (isLoading) {
       return (
         <View className="flex-1 bg-background justify-center items-center">
           <Text className="text-white text-lg">Loading...</Text>
         </View>
       );
     }

     if (error) {
       return (
         <View className="flex-1 bg-background p-4">
           <Text className="text-red-500 text-lg">Error: {error.message}</Text>
         </View>
       );
     }

     if (!data) {
       return (
         <View className="flex-1 bg-background p-4">
           <Text className="text-white text-lg">No data found for ID: {id}</Text>
         </View>
       );
     }

     return (
       <ScrollView className="flex-1 bg-background">
         <View className="p-4">
           <Text className="text-white text-2xl font-bold mb-4">Feature Details</Text>
           <NewFeatureComponent data={data} />
         </View>
       </ScrollView>
     );
   };
   ```

2. **Add route**:
   ```tsx
   // app/new-feature/[id].tsx
   import React from 'react';
   import { useLocalSearchParams } from 'expo-router';
   import { NewFeatureScreen } from '../../src/screens/NewFeatureScreen';

   export default function NewFeaturePage() {
     const { id } = useLocalSearchParams();
     return <NewFeatureScreen id={id as string} />;
   }
   ```

## Best Practices

### Code Quality

1. **Follow TypeScript Best Practices**:
   - Use explicit types instead of `any`
   - Use interfaces for object structures
   - Use type guards for narrowing

2. **Component Structure**:
   - Keep components focused on a single responsibility
   - Extract reusable logic to custom hooks
   - Use proper prop typing

3. **State Management**:
   - Follow the established observable pattern
   - Keep related state together
   - Use actions for state modifications

### Performance Optimization

1. **Memoization**:
   - Use `React.memo` for components that render often but change rarely
   - Use `useCallback` for function references
   - Use `useMemo` for expensive calculations

2. **List Rendering**:
   - Use `FlatList` or `SectionList` for long lists
   - Implement proper key handling
   - Use pagination for large datasets

3. **Async Operations**:
   - Implement loading states
   - Handle errors gracefully
   - Use cancellation tokens for abortable requests

### Testing Focus Areas

1. **Critical User Flows**:
   - Prioritize tests for main user journeys
   - Test edge cases thoroughly
   - Verify error handling

2. **State Management**:
   - Test state transitions
   - Verify action behavior
   - Test selectors and derived state

3. **Component Rendering**:
   - Test component appearance in different states
   - Test responsive behavior
   - Test accessibility features

## How to Add Specific Feature Types

### Adding a New API Integration

1. **SDK Extension**:
   ```typescript
   // src/hooks/useSdk.ts
   const getNewApiData = async (param1: string, param2: number) => {
     try {
       const result = await sdk.callNewApi(param1, param2);
       return result;
     } catch (error) {
       console.error('Error calling new API:', error);
       throw error;
     }
   };
   ```

2. **Hook Implementation**:
   ```typescript
   // src/hooks/useNewApiData.ts
   export const useNewApiData = () => {
     const sdk = useSdk();
     const [data, setData] = useState<ApiDataType | null>(null);
     const [isLoading, setIsLoading] = useState(false);
     const [error, setError] = useState<Error | null>(null);

     const fetchData = useCallback(async (param1: string, param2: number) => {
       setIsLoading(true);
       setError(null);
       
       try {
         const result = await sdk.getNewApiData(param1, param2);
         setData(result);
       } catch (err) {
         setError(err instanceof Error ? err : new Error(String(err)));
       } finally {
         setIsLoading(false);
       }
     }, [sdk]);

     return { data, isLoading, error, fetchData };
   };
   ```

### Adding a New UI Theme

1. **Define Theme Colors**:
   ```typescript
   // src/theme/colors.ts
   export const lightTheme = {
     background: '#ffffff',
     text: '#000000',
     primary: '#E75A5C',
     secondary: '#4A5568',
     card: '#f5f5f5',
     border: '#e2e8f0'
   };

   export const darkTheme = {
     background: '#1A202C',
     text: '#ffffff',
     primary: '#E75A5C',
     secondary: '#CBD5E0',
     card: '#2D3748',
     border: '#4A5568'
   };
   ```

2. **Theme Context**:
   ```typescript
   // src/context/ThemeContext.tsx
   import React, { createContext, useState, useContext, useEffect } from 'react';
   import { useColorScheme } from 'react-native';
   import AsyncStorage from '@react-native-async-storage/async-storage';
   import { lightTheme, darkTheme } from '../theme/colors';

   type ThemeType = 'light' | 'dark' | 'system';

   interface ThemeContextType {
     theme: typeof lightTheme | typeof darkTheme;
     themeType: ThemeType;
     setThemeType: (type: ThemeType) => void;
     isDark: boolean;
   }

   const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

   export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const systemColorScheme = useColorScheme();
     const [themeType, setThemeType] = useState<ThemeType>('system');
     
     useEffect(() => {
       const loadTheme = async () => {
         try {
           const savedTheme = await AsyncStorage.getItem('themeType');
           if (savedTheme) {
             setThemeType(savedTheme as ThemeType);
           }
         } catch (error) {
           console.error('Failed to load theme preference:', error);
         }
       };
       
       loadTheme();
     }, []);
     
     const setThemeTypeAndSave = (type: ThemeType) => {
       setThemeType(type);
       AsyncStorage.setItem('themeType', type).catch(error => {
         console.error('Failed to save theme preference:', error);
       });
     };
     
     const isDark = themeType === 'dark' || (themeType === 'system' && systemColorScheme === 'dark');
     const theme = isDark ? darkTheme : lightTheme;
     
     return (
       <ThemeContext.Provider value={{ theme, themeType, setThemeType: setThemeTypeAndSave, isDark }}>
         {children}
       </ThemeContext.Provider>
     );
   };

   export const useTheme = () => {
     const context = useContext(ThemeContext);
     if (!context) {
       throw new Error('useTheme must be used within a ThemeProvider');
     }
     return context;
   };
   ```

### Adding a New Chart/Visualization

1. **Install Chart Library**:
   ```bash
   npm install victory-native
   ```

2. **Create Chart Component**:
   ```tsx
   // src/components/BlockchainChart.tsx
   import React from 'react';
   import { View, Text, Dimensions } from 'react-native';
   import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';
   import { useBlockchainData } from '../hooks/useBlockchainData';

   export interface BlockchainChartProps {
     title: string;
     dataType: 'transactions' | 'blockTime' | 'gasUsage';
     timeRange: '24h' | '7d' | '30d';
   }

   export const BlockchainChart: React.FC<BlockchainChartProps> = ({ title, dataType, timeRange }) => {
     const { data, isLoading, error } = useBlockchainData(dataType, timeRange);
     const screenWidth = Dimensions.get('window').width;
     
     if (isLoading) {
       return (
         <View className="p-4 bg-gray-800 rounded-lg">
           <Text className="text-white text-lg font-bold">{title}</Text>
           <Text className="text-gray-400 mt-2">Loading chart data...</Text>
         </View>
       );
     }
     
     if (error) {
       return (
         <View className="p-4 bg-gray-800 rounded-lg">
           <Text className="text-white text-lg font-bold">{title}</Text>
           <Text className="text-red-500 mt-2">Error: {error.message}</Text>
         </View>
       );
     }
     
     if (!data || data.length === 0) {
       return (
         <View className="p-4 bg-gray-800 rounded-lg">
           <Text className="text-white text-lg font-bold">{title}</Text>
           <Text className="text-gray-400 mt-2">No data available</Text>
         </View>
       );
     }
     
     return (
       <View className="p-4 bg-gray-800 rounded-lg">
         <Text className="text-white text-lg font-bold mb-2">{title}</Text>
         <VictoryChart
           width={screenWidth - 40}
           height={300}
           theme={VictoryTheme.material}
           domainPadding={{ x: 10 }}
         >
           <VictoryAxis
             tickFormat={(x) => new Date(x).toLocaleDateString()}
             style={{
               axis: { stroke: '#718096' },
               tickLabels: { fill: '#CBD5E0', fontSize: 10, angle: -45 }
             }}
           />
           <VictoryAxis
             dependentAxis
             style={{
               axis: { stroke: '#718096' },
               tickLabels: { fill: '#CBD5E0', fontSize: 10 }
             }}
           />
           <VictoryLine
             data={data}
             x="timestamp"
             y="value"
             style={{
               data: { stroke: '#E75A5C', strokeWidth: 2 }
             }}
           />
         </VictoryChart>
       </View>
     );
   };
   ```

## Conclusion

By following this feature extension guide, you can add new functionality to the OL Explorer project while maintaining code quality, test coverage, and adherence to the established architecture. The guide provides patterns and examples for common extension scenarios, making it easier to implement new features consistently. 