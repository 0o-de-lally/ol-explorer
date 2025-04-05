import {observable} from '@legendapp/state';

interface BlockTimeState {
  blockTimeMs: number | null;
  lastBlockHeight: number | null;
  lastBlockTimestamp: number | null;
  lastLedgerVersion: number | null;
  isCalculating: boolean;
  error: string | null;
  tps: number | null;
  measurements: Array<{
    blockHeight: number;
    ledgerVersion: number;
    ledgerTimestamp: number;
    normalizedTimestamp: number;
  }>;
  maxMeasurements: number;
}

export const blockTimeStore = observable<BlockTimeState>({
  blockTimeMs: null,
  lastBlockHeight: null,
  lastBlockTimestamp: null,
  lastLedgerVersion: null,
  isCalculating: false,
  error: null,
  tps: null,
  measurements: [],
  maxMeasurements: 10
});

// Helper function to calculate metrics from measurements
const calculateMetrics = (measurements: BlockTimeState['measurements']) => {
  if (measurements.length < 2) {
    return {
      blockTimeMs: null,
      tps: null
    };
  }

  // Calculate time differences and increments for each pair of measurements
  const calculations = measurements.slice(1).map((curr, idx) => {
    const prev = measurements[idx];

    // Calculate normalized timestamps (divide by 10^6)
    const currNormalized = curr.ledgerTimestamp / 1_000_000;
    const prevNormalized = prev.ledgerTimestamp / 1_000_000;

    // Calculate time difference in seconds
    const timeDiff = currNormalized - prevNormalized;

    // Calculate block and version increments
    const blocksIncremented = curr.blockHeight - prev.blockHeight;
    const versionsIncremented = curr.ledgerVersion - prev.ledgerVersion;

    // Calculate rates
    const bps = blocksIncremented / timeDiff;
    const tps = versionsIncremented / timeDiff;

    // Calculate times
    const blockTime = 1 / bps;
    const txTime = 1 / tps;

    return {
      blockTimeMs: blockTime * 1000, // Convert to milliseconds
      tps
    };
  });

  // Calculate rolling averages
  const avgBlockTimeMs = calculations.reduce((sum, calc) => sum + (calc.blockTimeMs || 0), 0) / calculations.length;
  const avgTps = calculations.reduce((sum, calc) => sum + (calc.tps || 0), 0) / calculations.length;

  return {
    blockTimeMs: avgBlockTimeMs,
    tps: avgTps
  };
};

// Helper function to update measurements
export const updateMeasurements = (blockHeight: number, ledgerVersion: number, ledgerTimestamp: number) => {
  const normalizedTimestamp = ledgerTimestamp / 1_000_000;

  // Add new measurement
  blockTimeStore.measurements.push({
    blockHeight,
    ledgerVersion,
    ledgerTimestamp,
    normalizedTimestamp
  });

  // Keep only the last maxMeasurements
  const maxMeasurements = blockTimeStore.maxMeasurements.get();
  if (blockTimeStore.measurements.length > maxMeasurements) {
    blockTimeStore.measurements.set(blockTimeStore.measurements.slice(-maxMeasurements));
  }

  // Calculate new metrics
  const { blockTimeMs, tps } = calculateMetrics(blockTimeStore.measurements.get());

  // Update store values
  blockTimeStore.blockTimeMs.set(blockTimeMs);
  blockTimeStore.tps.set(tps);
  blockTimeStore.lastBlockHeight.set(blockHeight);
  blockTimeStore.lastBlockTimestamp.set(ledgerTimestamp);
  blockTimeStore.lastLedgerVersion.set(ledgerVersion);
};

// Helper function to get relative time string
export const getRelativeTimeString = (timestamp: number): string => {
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