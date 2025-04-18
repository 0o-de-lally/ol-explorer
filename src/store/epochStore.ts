import { observable } from '@legendapp/state';

// Config for data freshness
export const EPOCH_DATA_CONFIG = {
    MIN_FRESHNESS_MS: 30000, // 30 seconds
    REFRESH_INTERVAL_MS: 60000 // 1 minute
};

// Define data interfaces
export interface EpochData {
    bidders: string[];
    maxSeats: number;
    filledSeats: number;
    lastUpdated: number;
}

// Define store structure
export interface EpochStoreType {
    data: EpochData;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number;
}

// Initialize store with defaults
export const epochStore = observable<EpochStoreType>({
    data: {
        bidders: [],
        maxSeats: 0,
        filledSeats: 0,
        lastUpdated: 0
    },
    isLoading: false,
    error: null,
    lastUpdated: 0
});

// Function to notify UI updates
const notifyUpdate = () => {
    epochStore.lastUpdated.set(Date.now());
};

// Store actions
export const epochActions = {
    updateEpochData: (data: Partial<EpochData>) => {
        const timestamp = Date.now();

        // Update data fields WITHOUT clearing other fields
        if (data.bidders !== undefined) {
            epochStore.data.bidders.set(data.bidders);
        }
        if (data.maxSeats !== undefined) {
            epochStore.data.maxSeats.set(data.maxSeats);
        }
        if (data.filledSeats !== undefined) {
            epochStore.data.filledSeats.set(data.filledSeats);
        }

        // Update timestamp
        epochStore.data.lastUpdated.set(timestamp);
        notifyUpdate();
    },

    setLoading: (isLoading: boolean) => {
        epochStore.isLoading.set(isLoading);
        notifyUpdate();
    },

    setError: (error: string | null) => {
        epochStore.error.set(error);
        notifyUpdate();
    },

    isDataStale: (): boolean => {
        const lastUpdated = epochStore.data.lastUpdated.peek();
        const now = Date.now();
        return now - lastUpdated > EPOCH_DATA_CONFIG.MIN_FRESHNESS_MS;
    }
}; 