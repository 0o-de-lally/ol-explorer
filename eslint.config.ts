import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from "globals";

// Define common ignore patterns to be consistent across all configs
const commonIgnores = [
    'node_modules/**',
    'coverage/**',
    '.expo/**',
    'build/**',
    'dist/**',
    // Common config files
    'tailwind.config.js',
    'babel.config.js',
    'metro.config.js',
    '*.config.js',
    'tsconfig.json',
    'package.json',
    'bun.lock',
    'yarn.lock',
    'package-lock.json',
    'app.json',
    '.github/**',
    'public/**',
    'cypress.config.js',
    'jest.config.js'
];

export default [
    // Base configuration for TypeScript
    {
        files: ['**/*.{ts,tsx}'],
        ignores: commonIgnores,
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: {
                ...globals.browser,
            },
        },
        plugins: {
            'react': reactPlugin,
            'react-hooks': reactHooksPlugin,
            '@typescript-eslint': tsPlugin,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        // Use pre-defined rule sets
        rules: {
            // Extend recommended configs
            ...tsPlugin.configs.recommended.rules,
            ...reactPlugin.configs.recommended.rules,

            // Override specific rules
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',

            // React 17+ specific rules
            'react/jsx-uses-react': 'off',
            'react/react-in-jsx-scope': 'off',

            // React Hooks rules
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
];
