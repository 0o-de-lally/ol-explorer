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
    // Color palette for transaction function pills
    functionPillColors: [
      { bg: 'bg-[#E6F7FF]', text: 'text-[#0072C6]' }, // blue
      { bg: 'bg-[#F3ECFF]', text: 'text-[#6B46C1]' }, // purple
      { bg: 'bg-[#E6F7F5]', text: 'text-[#047857]' }, // green
      { bg: 'bg-[#FFF7E6]', text: 'text-[#B45309]' }, // orange
      { bg: 'bg-[#FFECEC]', text: 'text-[#A73737]' }  // red
    ],
    
    // Special function pill mappings (override the alphabetical index)
    specialFunctionPills: {
      'state_checkpoint': { bg: 'bg-[#FFECEC]', text: 'text-[#A73737]' }, // red
      'block_metadata': { bg: 'bg-[#E6F7FF]', text: 'text-[#0072C6]' }    // blue
    }
  }
};

export default appConfig; 