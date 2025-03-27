/**
 * Token Configuration
 * Contains all centralized settings for token display and formatting
 */

export interface TokenConfig {
    // Token display settings
    tokens: {
        [key: string]: {
            symbol: string;
            name: string;
            decimals: number;
            icon?: string;
        };
    };
}

/**
 * Default token configuration
 */
const tokenConfig: TokenConfig = {
    tokens: {
        libraToken: {
            symbol: "LIBRA",
            name: "Libra Coin",
            decimals: 6,
            icon: "libra-icon" // If we have an icon for the token
        },
        // Add more tokens as needed
    }
};

export default tokenConfig; 