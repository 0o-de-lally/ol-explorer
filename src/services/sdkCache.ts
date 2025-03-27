import sdkConfig from '../config/sdkConfig';
import { Transaction, TransactionDetail, Account, CacheType } from '../types/blockchain';

// Define types for cached items
interface CacheItem<T> {
    data: T;
    timestamp: number;
}

// Define types for specific cached data
interface SdkCache {
    blockHeight?: CacheItem<number>;
    epoch?: CacheItem<number>;
    chainId?: CacheItem<string>;
    transactions?: CacheItem<Transaction[]>;
    transactionDetails: Map<string, CacheItem<TransactionDetail>>;
    accounts: Map<string, CacheItem<Account>>;
}

// Initialize cache object
const cache: SdkCache = {
    transactionDetails: new Map(),
    accounts: new Map()
};

/**
 * Check if cached data is still fresh based on configured freshness settings
 */
const isCacheFresh = <T>(
    cacheItem: CacheItem<T> | undefined,
    freshnessSetting: number = sdkConfig.dataFreshness.defaultFreshness
): boolean => {
    if (!cacheItem) return false;

    const now = Date.now();
    const age = now - cacheItem.timestamp;

    return age < freshnessSetting;
};

/**
 * Cache block info data
 */
export const cacheBlockInfo = (
    blockHeight: number,
    epoch: number,
    chainId: string
): void => {
    const timestamp = Date.now();

    cache.blockHeight = { data: blockHeight, timestamp };
    cache.epoch = { data: epoch, timestamp };
    cache.chainId = { data: chainId, timestamp };

    console.log('Cached block info:', { blockHeight, epoch, chainId, timestamp });
};

/**
 * Get cached block height if fresh
 */
export const getCachedBlockHeight = (): number | null => {
    if (isCacheFresh(cache.blockHeight, sdkConfig.dataFreshness.blockInfo)) {
        return cache.blockHeight!.data;
    }
    return null;
};

/**
 * Get cached epoch if fresh
 */
export const getCachedEpoch = (): number | null => {
    if (isCacheFresh(cache.epoch, sdkConfig.dataFreshness.blockInfo)) {
        return cache.epoch!.data;
    }
    return null;
};

/**
 * Get cached chain ID if fresh
 */
export const getCachedChainId = (): string | null => {
    if (isCacheFresh(cache.chainId, sdkConfig.dataFreshness.blockInfo)) {
        return cache.chainId!.data;
    }
    return null;
};

/**
 * Cache transactions list
 */
export const cacheTransactions = (transactions: Transaction[]): void => {
    cache.transactions = {
        data: transactions,
        timestamp: Date.now()
    };

    console.log(`Cached ${transactions.length} transactions`);
};

/**
 * Get cached transactions if fresh
 */
export const getCachedTransactions = (): Transaction[] | null => {
    if (isCacheFresh(cache.transactions, sdkConfig.dataFreshness.transactions)) {
        return cache.transactions!.data;
    }
    return null;
};

/**
 * Cache transaction details
 */
export const cacheTransactionDetail = (hash: string, transaction: TransactionDetail): void => {
    cache.transactionDetails.set(hash, {
        data: transaction,
        timestamp: Date.now()
    });

    console.log(`Cached transaction details for hash: ${hash}`);
};

/**
 * Get cached transaction details if fresh
 */
export const getCachedTransactionDetail = (hash: string): TransactionDetail | null => {
    const cacheItem = cache.transactionDetails.get(hash);

    if (isCacheFresh(cacheItem, sdkConfig.dataFreshness.transactionDetails)) {
        return cacheItem!.data;
    }
    return null;
};

/**
 * Cache account information
 */
export const cacheAccount = (address: string, account: Account): void => {
    cache.accounts.set(address, {
        data: account,
        timestamp: Date.now()
    });

    console.log(`Cached account info for address: ${address}`);
};

/**
 * Get cached account if fresh
 */
export const getCachedAccount = (address: string): Account | null => {
    const cacheItem = cache.accounts.get(address);

    if (isCacheFresh(cacheItem, sdkConfig.dataFreshness.accountInfo)) {
        return cacheItem!.data;
    }
    return null;
};

/**
 * Clear the entire cache or specific cache items
 */
export const clearCache = (type?: CacheType): void => {
    if (!type) {
        // Clear all cache
        cache.blockHeight = undefined;
        cache.epoch = undefined;
        cache.chainId = undefined;
        cache.transactions = undefined;
        cache.transactionDetails.clear();
        cache.accounts.clear();
        console.log('Cleared all cache');
        return;
    }

    switch (type) {
        case 'blockInfo':
            cache.blockHeight = undefined;
            cache.epoch = undefined;
            cache.chainId = undefined;
            console.log('Cleared block info cache');
            break;
        case 'transactions':
            cache.transactions = undefined;
            console.log('Cleared transactions cache');
            break;
        case 'transactionDetails':
            cache.transactionDetails.clear();
            console.log('Cleared transaction details cache');
            break;
        case 'accounts':
            cache.accounts.clear();
            console.log('Cleared accounts cache');
            break;
    }
}; 