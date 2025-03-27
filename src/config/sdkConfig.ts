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

/**
 * Default SDK configuration
 */
const sdkConfig: SdkConfig = {
    // RPC Connection Settings
    rpcUrl: 'https://rpc.openlibra.space:8080/v1',
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