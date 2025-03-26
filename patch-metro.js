const fs = require('fs');
const path = require('path');

// Path to the file we need to patch
const filePath = path.join(
    __dirname,
    'node_modules/metro/src/Server.js'
);

// Read the file content
let content = fs.readFileSync(filePath, 'utf-8');

// Find the decodeURI call and add a try/catch around it
content = content.replace(
    /const pathname = decodeURI\(parsedUrl\.pathname\)/g,
    `let pathname;
      try {
        pathname = decodeURI(parsedUrl.pathname);
      } catch (e) {
        console.warn('Failed to decode URI:', parsedUrl.pathname);
        pathname = parsedUrl.pathname;
      }`
);

// Write the patched file back
fs.writeFileSync(filePath, content, 'utf-8');

console.log('Metro Server.js patched successfully'); 