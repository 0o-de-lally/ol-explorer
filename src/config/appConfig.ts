/**
 * Application-wide configuration settings
 */
export const appConfig = {
  // Transaction display limits
  transactions: {
    defaultLimit: 25,       // Initial number of transactions to load
    incrementSize: 25,      // How many more to load when clicking "Load More"
    maxLimit: 100           // Maximum number of transactions that can be loaded (API limit)
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