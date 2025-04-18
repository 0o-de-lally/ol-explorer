import { observable } from '@legendapp/state';

// Config for data freshness
export const VOUCHING_DATA_CONFIG = {
    MIN_FRESHNESS_MS: 30000, // 30 seconds
    REFRESH_INTERVAL_MS: 60000 // 1 minute
};

// Define data interfaces
export interface VouchingData {
    vouchesOutbound: string[];
    vouchesInbound: string[];
    pageRankScore: number;
    lastUpdated: number;
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

// Function to notify UI updates
const notifyUpdate = () => {
    vouchingStore.lastUpdated.set(Date.now());
};

// Store actions
export const vouchingActions = {
    updateVouchingData: (address: string, data: Partial<VouchingData>) => {
        const existingData = vouchingStore.items[address].peek();
        const timestamp = Date.now();

        if (!existingData) {
            // Initialize new entry
            vouchingStore.items[address].set({
                vouchesOutbound: data.vouchesOutbound || [],
                vouchesInbound: data.vouchesInbound || [],
                pageRankScore: data.pageRankScore ?? 0,
                lastUpdated: timestamp
            });
        } else {
            // Update existing data WITHOUT clearing other fields
            if (data.vouchesOutbound !== undefined) {
                vouchingStore.items[address].vouchesOutbound.set(data.vouchesOutbound);
            }
            if (data.vouchesInbound !== undefined) {
                vouchingStore.items[address].vouchesInbound.set(data.vouchesInbound);
            }
            if (data.pageRankScore !== undefined) {
                vouchingStore.items[address].pageRankScore.set(data.pageRankScore);
            }

            // Update timestamp
            vouchingStore.items[address].lastUpdated.set(timestamp);
        }

        notifyUpdate();
    },

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