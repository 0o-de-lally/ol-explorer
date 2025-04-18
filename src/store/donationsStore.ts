import { observable } from '@legendapp/state';

// Config for data freshness
export const DONATIONS_DATA_CONFIG = {
    MIN_FRESHNESS_MS: 30000, // 30 seconds
    REFRESH_INTERVAL_MS: 60000 // 1 minute
};

// Define data interfaces
export interface Donation {
    dvAccount: string;
    amount: number | string;
    donor?: string;
}

export interface DonationsData {
    donationsMade: Donation[];
    donationsReceived: Donation[];
    lastUpdated: number;
}

// Define store structure
export interface DonationsStoreType {
    items: Record<string, DonationsData>;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number;
}

// Initialize store with defaults
export const donationsStore = observable<DonationsStoreType>({
    items: {},
    isLoading: false,
    error: null,
    lastUpdated: 0
});

// Function to notify UI updates
const notifyUpdate = () => {
    donationsStore.lastUpdated.set(Date.now());
};

// Store actions
export const donationsActions = {
    updateDonationsData: (address: string, data: Partial<DonationsData>) => {
        const existingData = donationsStore.items[address].peek();
        const timestamp = Date.now();

        if (!existingData) {
            // Initialize new entry
            donationsStore.items[address].set({
                donationsMade: data.donationsMade || [],
                donationsReceived: data.donationsReceived || [],
                lastUpdated: timestamp
            });
        } else {
            // Update existing data WITHOUT clearing other fields
            if (data.donationsMade !== undefined) {
                donationsStore.items[address].donationsMade.set(data.donationsMade);
            }
            if (data.donationsReceived !== undefined) {
                donationsStore.items[address].donationsReceived.set(data.donationsReceived);
            }

            // Update timestamp
            donationsStore.items[address].lastUpdated.set(timestamp);
        }

        notifyUpdate();
    },

    setLoading: (isLoading: boolean) => {
        donationsStore.isLoading.set(isLoading);
        notifyUpdate();
    },

    setError: (error: string | null) => {
        donationsStore.error.set(error);
        notifyUpdate();
    },

    isDataStale: (address: string): boolean => {
        const item = donationsStore.items[address].peek();
        if (!item) return true;

        const now = Date.now();
        return now - item.lastUpdated > DONATIONS_DATA_CONFIG.MIN_FRESHNESS_MS;
    }
}; 