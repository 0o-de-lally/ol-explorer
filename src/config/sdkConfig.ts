/**
 * SDK Configuration
 * Contains all centralized settings for blockchain SDK interaction
 */

export interface SdkConfig {
    // RPC Connection Settings
    rpcUrl: string;
    network: 'mainnet' | 'testnet' | 'devnet';

    // Data Freshness Settings
    dataFreshness: {
        // Default time in milliseconds for which data is considered fresh
        defaultFreshness: number;
        // Time in milliseconds for which specific data types are considered fresh
        blockInfo: number;
        transactions: number;
        accountInfo: number;
        transactionDetails: number;
    };

    // SDK Behavior
    debugMode: boolean;
    retryOnFailure: boolean;
    maxRetries: number;
    retryDelay: number;

    // Polling intervals
    pollingIntervals: {
        homeScreenRefresh: number;
    };
}

// Get RPC URL from environment variable if available
const getRpcUrl = (): string => {
    // Check for Node.js environment variables
    if (typeof process !== 'undefined' && process.env && process.env.LIBRA_RPC_URL) {
        return process.env.LIBRA_RPC_URL;
    }
    
    // Check for Expo/React Native environment variables
    if (typeof global !== 'undefined' && global.process && global.process.env && global.process.env.EXPO_PUBLIC_RPC_URL) {
        return global.process.env.EXPO_PUBLIC_RPC_URL;
    }
    
    // Default RPC URL
    return 'https://rpc.openlibra.space:8080/v1';
};

/**
 * Default SDK configuration
 */
const sdkConfig: SdkConfig = {
    // RPC Connection Settings
    rpcUrl: getRpcUrl(),
    network: 'mainnet',

    // Data Freshness Settings (all in milliseconds)
    dataFreshness: {
        defaultFreshness: 30000, // 30 seconds
        blockInfo: 15000,        // 15 seconds
        transactions: 20000,     // 20 seconds
        accountInfo: 60000,      // 1 minute
        transactionDetails: 300000, // 5 minutes (transaction details rarely change once confirmed)
    },

    // SDK Behavior
    debugMode: false,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 1000, // 1 second

    // Polling intervals
    pollingIntervals: {
        homeScreenRefresh: 30000, // 30 seconds
    }
};

export default sdkConfig;