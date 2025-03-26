import { observable } from '@legendapp/state';

interface BlockTimeState {
  blockTimeMs: number | null;
  lastBlockHeight: number | null;
  lastBlockTimestamp: number | null;
  isCalculating: boolean;
  error: string | null;
}

export const blockTimeStore = observable<BlockTimeState>({
  blockTimeMs: null,
  lastBlockHeight: null,
  lastBlockTimestamp: null,
  isCalculating: false,
  error: null
});

// Helper function to calculate time difference between blocks
export const calculateBlockTime = (height1: number, timestamp1: number, height2: number, timestamp2: number): number => {
  const heightDiff = Math.abs(height2 - height1);
  const timeDiff = Math.abs(timestamp2 - timestamp1);
  return timeDiff / heightDiff;
};

// Helper function to get relative time string
export const getRelativeTimeString = (timestamp: number, blockTimeMs: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return new Date(timestamp).toLocaleString();
  }
}; 