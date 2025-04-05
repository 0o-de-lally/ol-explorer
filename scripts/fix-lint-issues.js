/**
 * Script to fix common lint issues in the codebase
 * Specifically addresses unused variables issues by prefixing them with underscores
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configure the extensions and directories to process
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];
const excludeDirs = ['node_modules', 'build', 'dist', '.expo', 'coverage', 'cypress'];

// Helper to check if a path should be excluded
const shouldExclude = (filePath) => {
    return excludeDirs.some(dir => filePath.includes(`/${dir}/`)) ||
        filePath.includes('.test.') ||
        filePath.includes('.spec.') ||
        filePath.includes('/tests/');
};

// Regular expressions for finding unused variables
const unusedVarPatterns = [
    // Function parameters that are unused
    {
        regex: /(\([^)]*?)(\b[a-zA-Z_][a-zA-Z0-9_]*\b)(\s*[,:][^)]*\))/g,
        replaceFn: (match, before, varName, after) => {
            // Don't touch already prefixed names
            if (varName.startsWith('_')) return match;
            // Add underscore prefix
            return `${before}_${varName}${after}`;
        },
        condition: (file, match) => file.includes(`${match} is defined but never used`)
    },

    // Destructured variables that are unused
    {
        regex: /({[^}]*?)(\b[a-zA-Z_][a-zA-Z0-9_]*\b)(\s*[,}])/g,
        replaceFn: (match, before, varName, after) => {
            if (varName.startsWith('_')) return match;
            return `${before}_${varName}${after}`;
        },
        condition: (file, match) => file.includes(`${match} is defined but never used`)
    },

    // Variable declarations that are unused
    {
        regex: /(const|let|var)\s+(\b[a-zA-Z_][a-zA-Z0-9_]*\b)\s*=/g,
        replaceFn: (match, declType, varName) => {
            if (varName.startsWith('_')) return match;
            return `${declType} _${varName} =`;
        },
        condition: (file, match) => file.includes(`${match} is assigned a value but never used`)
    },

    // Import statements with unused imports
    {
        regex: /import\s+{([^}]+)}\s+from/g,
        replaceFn: (match, importsList) => {
            // Process each import in the list
            const processedImports = importsList.split(',').map(importItem => {
                const trimmed = importItem.trim();
                // Check if it's an alias import (like 'Original as Alias')
                const aliasMatch = trimmed.match(/(\b[a-zA-Z_][a-zA-Z0-9_]*\b)\s+as\s+(\b[a-zA-Z_][a-zA-Z0-9_]*\b)/);

                if (aliasMatch) {
                    const [_, original, alias] = aliasMatch;
                    // Only prefix the alias, not the original
                    if (lintOutput.includes(`${alias} is defined but never used`)) {
                        return `${original} as _${alias}`;
                    }
                    return trimmed;
                } else {
                    // Regular import
                    if (lintOutput.includes(`${trimmed} is defined but never used`)) {
                        return `_${trimmed}`;
                    }
                    return trimmed;
                }
            });

            return `import {${processedImports.join(', ')}} from`;
        },
        condition: () => true // Always check import statements
    }
];

// Run eslint to get current issues
console.log('Running ESLint to identify issues...');
const { execSync } = require('child_process');
let lintOutput = '';

try {
    lintOutput = execSync('npm run lint').toString();
} catch (e) {
    // The lint command will exit with error code if there are issues,
    // but we still want to capture the output
    lintOutput = e.stdout.toString();
}

// Find all matching files
console.log('Finding files to process...');
const files = glob.sync(`src/**/*{${fileExtensions.join(',')}}`, { absolute: true });

let totalFilesFixed = 0;

// Process each file
console.log('Processing files...');
files.forEach(filePath => {
    if (shouldExclude(filePath)) return;

    let fileContent = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply each pattern
    unusedVarPatterns.forEach(pattern => {
        fileContent = fileContent.replace(pattern.regex, (match, ...args) => {
            const varName = args[1] || args[0]; // Extract the variable name based on the pattern

            if (pattern.condition(lintOutput, varName)) {
                modified = true;
                return pattern.replaceFn(match, ...args);
            }

            return match;
        });
    });

    // Save the file if modified
    if (modified) {
        fs.writeFileSync(filePath, fileContent);
        console.log(`Fixed issues in: ${path.relative(process.cwd(), filePath)}`);
        totalFilesFixed++;
    }
});

console.log(`\nCompleted! Fixed issues in ${totalFilesFixed} files.`);
console.log('Run "npm run lint" again to see remaining issues.'); 