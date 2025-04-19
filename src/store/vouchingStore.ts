import { observable } from '@legendapp/state';
import { VouchInfo } from '../hooks/useSdk';

// Config for data freshness
export const VOUCHING_DATA_CONFIG = {
    MIN_FRESHNESS_MS: 30000, // 30 seconds
    REFRESH_INTERVAL_MS: 60000 // 1 minute
};

// Define data interfaces
export interface VouchingData {
    vouchesOutbound: VouchInfo[];
    vouchesInbound: VouchInfo[];
    pageRankScore: number;
    lastUpdated: number;
    currentEpoch?: number; // Make it optional for backward compatibility
}

// Define store structure
export interface VouchingStoreType {
    items: Record<string, VouchingData>;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number;
}

// Initialize store with defaults
export const vouchingStore = observable<VouchingStoreType>({
    items: {},
    isLoading: false,
    error: null,
    lastUpdated: 0
});

/**
 * Notify subscribers about updates to the vouching store
 * This ensures reactivity by recreating references for nested objects
 * and triggering a custom event for component listeners
 */
const notifyUpdate = () => {
    // Update lastUpdated timestamp to trigger reactivity
    const now = Date.now();
    vouchingStore.lastUpdated.set(now);

    // Ensure all nested objects get new references to trigger reactivity properly
    const addresses = Object.keys(vouchingStore.items.peek() || {});

    for (const address of addresses) {
        const item = vouchingStore.items[address].peek();
        if (item) {
            // Create new references for arrays to ensure reactivity
            if (Array.isArray(item.vouchesOutbound)) {
                vouchingStore.items[address].vouchesOutbound.set([...item.vouchesOutbound]);
            }

            if (Array.isArray(item.vouchesInbound)) {
                vouchingStore.items[address].vouchesInbound.set([...item.vouchesInbound]);
            }

            vouchingStore.items[address].lastUpdated.set(now);
        }
    }

    // Dispatch a custom event that components can listen for
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vouching-updated', {
            detail: { timestamp: now, addresses }
        }));
    }
};

/**
 * Update vouching data for an address
 * @param address The address to update data for
 * @param data The new vouching data
 */
const updateVouchingData = (address: string, data: VouchingData) => {
    // Ensure the address exists in the store
    if (!vouchingStore.items[address].peek()) {
        vouchingStore.items[address].set({
            vouchesOutbound: [],
            vouchesInbound: [],
            pageRankScore: 0,
            lastUpdated: Date.now()
        });
    }

    // Update each property individually to ensure reactivity
    vouchingStore.items[address].vouchesOutbound.set([...data.vouchesOutbound]);
    vouchingStore.items[address].vouchesInbound.set([...data.vouchesInbound]);
    vouchingStore.items[address].pageRankScore.set(data.pageRankScore);
    vouchingStore.items[address].lastUpdated.set(Date.now());

    // Notify UI about the update
    notifyUpdate();
};

// Store actions
export const vouchingActions = {
    updateVouchingData: updateVouchingData,

    setLoading: (isLoading: boolean) => {
        vouchingStore.isLoading.set(isLoading);
        notifyUpdate();
    },

    setError: (error: string | null) => {
        vouchingStore.error.set(error);
        notifyUpdate();
    },

    isDataStale: (address: string): boolean => {
        const item = vouchingStore.items[address].peek();
        if (!item) return true;

        const now = Date.now();
        return now - item.lastUpdated > VOUCHING_DATA_CONFIG.MIN_FRESHNESS_MS;
    }
}; 