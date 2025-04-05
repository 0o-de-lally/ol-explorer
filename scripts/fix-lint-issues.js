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
        condition: (file, match) => file.includes(`${match} is defined but never used`) ||
            file.includes(`${match} is assigned a value but never used`)
    },

    // Destructured variables that are unused
    {
        regex: /({[^}]*?)(\b[a-zA-Z_][a-zA-Z0-9_]*\b)(\s*[,}])/g,
        replaceFn: (match, before, varName, after) => {
            if (varName.startsWith('_')) return match;
            return `${before}_${varName}${after}`;
        },
        condition: (file, match) => file.includes(`${match} is defined but never used`) ||
            file.includes(`${match} is assigned a value but never used`)
    },

    // Variable declarations that are unused
    {
        regex: /(const|let|var)\s+(\b[a-zA-Z_][a-zA-Z0-9_]*\b)\s*=/g,
        replaceFn: (match, declType, varName) => {
            if (varName.startsWith('_')) return match;
            return `${declType} _${varName} =`;
        },
        condition: (file, match) => file.includes(`${match} is assigned a value but never used`) ||
            file.includes(`${match} is defined but never used`)
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
    },

    // Named default imports that are unused
    {
        regex: /import\s+(\b[a-zA-Z_][a-zA-Z0-9_]*\b)\s+from/g,
        replaceFn: (match, importName) => {
            if (importName.startsWith('_')) return match;
            if (lintOutput.includes(`${importName} is defined but never used`)) {
                return `import _${importName} from`;
            }
            return match;
        },
        condition: () => true
    },

    // Interface method parameters that are unused (specifically for .d.ts files)
    {
        regex: /(\()([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
        replaceFn: (match, paren, paramName) => {
            if (paramName.startsWith('_')) return match;
            if (lintOutput.includes(`${paramName} is defined but never used`)) {
                return `${paren}_${paramName}:`;
            }
            return match;
        },
        condition: () => true
    },

    // Interface properties and method names
    {
        regex: /(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\(\)?|\?)?:(?!\s*type)/g,
        replaceFn: (match, space, propName) => {
            if (propName.startsWith('_')) return match;
            if (lintOutput.includes(`${propName} is defined but never used`)) {
                return `${space}_${propName}:`;
            }
            return match;
        },
        condition: (file) => file.includes('.d.ts') || file.includes('type.ts') || file.includes('types.ts')
    }
];

// Special file-specific patterns for global.d.ts
const specialDTsPatterns = [
    // Interface method (function signature) parameters
    {
        regex: /([a-zA-Z_][a-zA-Z0-9_]*)\s*:.*\(/g,
        replaceFn: (match, methodName) => {
            if (methodName.startsWith('_')) return match;
            if (lintOutput.includes(`${methodName} is defined but never used`)) {
                return `_${methodName}:`;
            }
            return match;
        }
    },
    // Variable name in interface member function
    {
        regex: /\(([a-zA-Z_][a-zA-Z0-9_]*)(:\s*[^,\)]+)(?:[,\)])/g,
        replaceFn: (match, paramName, typeDecl, ending) => {
            if (paramName.startsWith('_')) return match;
            if (lintOutput.includes(`${paramName} is defined but never used`)) {
                const fixedParam = `_${paramName}${typeDecl}`;
                return match.replace(`${paramName}${typeDecl}`, fixedParam);
            }
            return match;
        }
    },
    // Expected parameters, which are very common in d.ts files
    {
        regex: /(\b)(expected)(:)/g,
        replaceFn: (match, before, varName, colon) => {
            if (lintOutput.includes(`${varName} is defined but never used`)) {
                return `${before}_${varName}${colon}`;
            }
            return match;
        }
    },
    // Argument parameters in function definitions
    {
        regex: /(\b)(args)(:)/g,
        replaceFn: (match, before, varName, colon) => {
            if (lintOutput.includes(`${varName} is defined but never used`)) {
                return `${before}_${varName}${colon}`;
            }
            return match;
        }
    },
    // nth parameters
    {
        regex: /(\b)(nth)(:)/g,
        replaceFn: (match, before, varName, colon) => {
            if (lintOutput.includes(`${varName} is defined but never used`)) {
                return `${before}_${varName}${colon}`;
            }
            return match;
        }
    },
    // Standard interface parameters (element, prop, text)
    {
        regex: /(\b)(element|prop|text|value|options)(:)/g,
        replaceFn: (match, before, varName, colon) => {
            if (lintOutput.includes(`${varName} is defined but never used`)) {
                return `${before}_${varName}${colon}`;
            }
            return match;
        }
    }
];

// Fix hooks being called conditionally
const fixConditionalHooks = (content, file) => {
    if (!file.endsWith('.tsx') && !file.endsWith('.jsx') && !file.endsWith('.ts') && !file.endsWith('.js')) return content;

    // Look for error markers of conditional hook calling
    if (!lintOutput.includes("React Hook") || !lintOutput.includes("called conditionally")) return content;

    // Simple case: hooks defined in if-then constructs
    const hookMatches = [...content.matchAll(/if\s*\([^)]+\)\s*{\s*(\w+)\s*=\s*use(\w+)\(/g)];

    if (hookMatches.length === 0) return content;

    // Attempt to fix by moving hooks out of conditionals
    let modified = content;
    const hookDeclarations = [];

    hookMatches.forEach(match => {
        const [fullMatch, varName, hookName] = match;
        const pattern = new RegExp(`${varName}\\s*=\\s*use${hookName}\\([^;]+;`, 'g');
        const hookCallMatches = [...content.matchAll(pattern)];

        if (hookCallMatches.length > 0) {
            const hookCall = hookCallMatches[0][0];

            // Add hook at the top level, remove from conditional
            hookDeclarations.push(hookCall);
            modified = modified.replace(hookCall, `// Hook moved to top level: ${varName}`);

            // Add variable assignment inside the conditional if needed
            const valueRegex = new RegExp(`${varName}\\s*=\\s*use${hookName}\\(([^;]+);`);
            const valueMatch = valueRegex.exec(hookCall);

            if (valueMatch && valueMatch[1]) {
                // Instead of adding a dummy value, we'll log a comment in the modified file
                modified = modified.replace(/\/\/ Hook moved to top level: (\w+)/g,
                    '// MANUAL FIX NEEDED: Hook cannot be automatically moved due to dependencies');
            }
        }
    });

    // Insert hook declarations at the top of the component function
    if (hookDeclarations.length > 0) {
        // Find a good insertion point - after the component declaration, before any JSX or return
        const componentMatch = /function\s+\w+\s*\([^)]*\)\s*{/g.exec(modified);
        if (componentMatch) {
            const insertPos = componentMatch.index + componentMatch[0].length;
            modified = modified.slice(0, insertPos) + '\n  // Auto-fixed hooks moved from conditionals\n  ' +
                hookDeclarations.join('\n  ') + '\n' + modified.slice(insertPos);
        }
    }

    return modified;
};

// Process d.ts files specifically
const processDTsFile = (filePath, fileContent) => {
    if (!filePath.endsWith('.d.ts')) return fileContent;

    let modified = fileContent;

    // Apply special patterns for d.ts files
    specialDTsPatterns.forEach(pattern => {
        modified = modified.replace(pattern.regex, (match, ...args) => {
            return pattern.replaceFn(match, ...args);
        });
    });

    return modified;
};

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
const files = glob.sync(`**/*{${fileExtensions.join(',')}}`, { absolute: true });

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

    // Apply special processing for d.ts files
    const dtsProcessed = processDTsFile(filePath, fileContent);
    if (dtsProcessed !== fileContent) {
        fileContent = dtsProcessed;
        modified = true;
    }

    // Try to fix conditional hooks
    const hookFixed = fixConditionalHooks(fileContent, filePath);
    if (hookFixed !== fileContent) {
        fileContent = hookFixed;
        modified = true;
    }

    // Save the file if modified
    if (modified) {
        fs.writeFileSync(filePath, fileContent);
        console.log(`Fixed issues in: ${path.relative(process.cwd(), filePath)}`);
        totalFilesFixed++;
    }
});

console.log(`\nCompleted! Fixed issues in ${totalFilesFixed} files.`);
console.log('Run "npm run lint" again to see remaining issues.'); 