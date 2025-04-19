/**
 * Application-wide configuration settings
 */
export const appConfig = {
  // Blockchain network configuration
  network: {
    OL_FRAMEWORK: "0x1"     // OL Framework address (usually 0x1 on mainnet)
  },

  // Transaction display limits
  transactions: {
    defaultLimit: 25,       // Initial number of transactions to load
    incrementSize: 25,      // How many more to load when clicking "Load More"
    maxLimit: 100           // Maximum number of transactions that can be loaded (API limit)
  },

  // Vouching configuration
  vouching: {
    expiryWindow: 45,       // Number of epochs before a vouch expires
    warningThreshold: 10    // Number of epochs before expiry to start showing warnings
  },

  // Blockchain metrics configuration
  metrics: {
    // Control which metrics are displayed in the HUD
    display: {
      // Row 1: Chain state metrics
      row1: {
        latestVersion: {
          enabled: true,
          label: 'Latest Version',
          tooltip: 'Most recent transaction version number'
        },
        blockHeight: {
          enabled: true,
          label: 'Block Height',
          tooltip: 'Current blockchain height'
        },
        epoch: {
          enabled: true,
          label: 'Epoch',
          tooltip: 'Current epoch number'
        },
        chainId: {
          enabled: true,
          label: 'Chain ID',
          tooltip: 'Network chain identifier'
        }
      },
      // Row 2: Performance metrics
      row2: {
        blockTime: {
          enabled: true,
          label: 'Block Time',
          tooltip: 'Average time between blocks'
        },
        tps: {
          enabled: true,
          label: 'TPS',
          tooltip: 'Transactions per second'
        },
        ledgerTime: {
          enabled: true,
          label: 'Ledger Time',
          tooltip: 'Latest ledger timestamp'
        }
      }
    },
    // Configuration for metrics calculations
    calculations: {
      maxMeasurements: 10,  // Number of measurements to keep for rolling averages
      updateInterval: 10000 // Update interval in milliseconds
    }
  },

  // UI Configuration
  ui: {
    // Color palette for transaction function pills - darker pastels
    functionPillColors: [
      { bg: 'bg-[#CCE6FF]', text: 'text-[#0052A3]' }, // deep blue
      { bg: 'bg-[#E6CCFF]', text: 'text-[#5B1B9E]' }, // deep purple
      { bg: 'bg-[#CCFFCC]', text: 'text-[#1B5E20]' }, // deep green
      { bg: 'bg-[#FFD9B3]', text: 'text-[#BF360C]' }, // deep orange
      { bg: 'bg-[#FFCCCC]', text: 'text-[#B71C1C]' }  // deep red
    ],

    // Special function pill mappings (override the alphabetical index)
    specialFunctionPills: {
      'state_checkpoint': { bg: 'bg-[#FFCCCC]', text: 'text-[#B71C1C]' }, // deep red
      'block_metadata': { bg: 'bg-[#CCE6FF]', text: 'text-[#0052A3]' }    // deep blue
    }
  }
};

export default appConfig; 