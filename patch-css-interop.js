const fs = require('fs');
const path = require('path');

// Path to the file we need to patch
const filePath = path.join(
    __dirname,
    'node_modules/react-native-css-interop/src/metro/index.ts'
);

// Read the file content
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the problematic code - specifically, fix issues with URI handling in the server middleware
const patchedCode = `
            server.use(async (req, res, next) => {
              try {
                // Wait until the bundler patching has completed
                await virtualModulesPossible;
                next();
              } catch (error) {
                console.error('CSS Interop error:', error);
                next();
              }
            });
`;

// Find and replace the problematic section
content = content.replace(
    /server\.use\(async \(_, __, next\) => \{\s*\/\/ Wait until the bundler patching has completed\s*await virtualModulesPossible;\s*next\(\);\s*\}\);/,
    patchedCode
);

// Add a try/catch to the decodeURI part
content = content.replace(
    /const resolved = resolver\(context, moduleName, platform\);/,
    `let resolved;
        try {
          resolved = resolver(context, moduleName, platform);
        } catch (error) {
          console.error('Error resolving module:', moduleName, error);
          // Return a safe fallback
          return { type: "empty" };
        }`
);

// Write the patched file back
fs.writeFileSync(filePath, content, 'utf-8');

console.log('react-native-css-interop patched successfully'); 