# Data Fetching in the Open Libra Explorer

This document outlines the data fetching architecture in the Open Libra Explorer application, with a focus on timestamp handling and account resources.

## Blockchain SDK Integration

The application uses a custom hook `useSdk` to interact with the Open Libra blockchain through:
- The official Open Libra SDK for production
- A mock implementation for development or when the network is unavailable

### Key API Implementation Details

#### Timestamp Handling

One of the most critical aspects of blockchain data presentation is handling timestamps correctly:

1. **Raw Timestamp Storage**: We store all timestamps as strings in our data models to preserve precision
   - Blockchain timestamps often come in microseconds (vs milliseconds in JavaScript)
   - Converting too early can lead to precision loss
   - Using string representation avoids unintended type coercion

2. **Conversion at Display Time**: We only convert timestamps to readable formats at the UI layer
   - This ensures consistency across different views
   - Prevents multiple conversions through the data flow
   - Common utility functions handle the conversion consistently

3. **Fallback Mechanisms**: For any missing or invalid timestamps, we implement fallbacks to:
   - Use current time when a timestamp is completely missing
   - Log warnings for debugging purposes
   - Display user-friendly error messages when appropriate

#### Account Resources Handling

Account resources on the Open Libra blockchain contain rich information about the account state:

1. **Resource Collection**: We fetch all resources for an account to provide a complete view
   - Account balances
   - Staking information
   - Module data and other custom resources

2. **Type Filtering**: We implement filters to identify specific resource types:
   - Coin resources for balance information (`0x1::coin::CoinStore<>`)
   - Special handling for AptosCoin resources
   - Custom resource parsers for known types

3. **Data Extraction**: For each resource type, we:
   - Extract relevant data using safe property access patterns
   - Convert numeric values from string representations when needed
   - Provide default values for missing properties

4. **Error Handling**: We implement robust error handling for:
   - Non-existent accounts
   - Network failures
   - Invalid or unexpected data structures

## Implementation Benefits

The current implementation provides several advantages:

1. **Consistency**: By storing raw data and only transforming at display time, we ensure consistency across the application
2. **Robustness**: Comprehensive error handling improves the user experience even when data is incomplete
3. **Maintainability**: Clear separation of data fetching and display logic makes the code more maintainable
4. **Performance**: Minimizing unnecessary transformations improves application performance

## Future Improvements

Planned improvements for the data fetching layer include:

1. **Caching**: Implement more sophisticated caching for frequently accessed data
2. **Pagination**: Enhance transaction list pagination for better performance
3. **Subscription**: Add WebSocket subscriptions for real-time updates
4. **Resource Type Registry**: Develop a registry of known resource types for better display 