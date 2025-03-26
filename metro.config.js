const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add custom resolver options to handle URI encoding issues
config.resolver = {
    ...config.resolver,
    sourceExts: [...(config.resolver.sourceExts || []), 'mjs', 'cjs'],
    assetExts: [...(config.resolver.assetExts || []), 'md'],
    // Enable this if you encounter path troubles with escaping special characters
    extraNodeModules: new Proxy({}, {
        get: (target, name) => {
            return path.join(process.cwd(), `node_modules/${name}`)
        }
    })
};

// Add safe serializer config
config.serializer = {
    ...config.serializer,
    getPolyfills: () => require('metro-config/src/defaults/polyfills')(),
};

module.exports = withNativeWind(config, { input: './global.css' }); 