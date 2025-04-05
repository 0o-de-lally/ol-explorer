const js = require('@eslint/js');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
    js.configs.recommended,
    {
        ignores: ['node_modules/', 'coverage/', '.expo/', 'build/', 'dist/'],
    },
    {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
        plugins: {
            '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
            'react': require('eslint-plugin-react'),
            'react-hooks': require('eslint-plugin-react-hooks'),
        },
        languageOptions: {
            parser: require('@typescript-eslint/parser'),
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                fetch: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',

                // Node.js globals
                process: 'readonly',
                require: 'readonly',
                module: 'readonly',
                __dirname: 'readonly',
                global: 'readonly',

                // React Native globals
                React: 'readonly',

                // Testing globals
                jest: 'readonly',
                expect: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                test: 'readonly',

                // Cypress globals
                cy: 'readonly',
                Cypress: 'readonly',

                // Custom globals
                NodeJS: 'readonly',
                CustomEvent: 'readonly',
                EventListener: 'readonly',
                MediaQueryList: 'readonly',
                MediaQueryListEvent: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                Crypto: 'readonly',
                self: 'readonly',
                caches: 'readonly',
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            // React rules
            'react/react-in-jsx-scope': 'off', // Not needed with React 17+
            'react/prop-types': 'off', // Not needed with TypeScript
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // TypeScript rules
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true
            }],
            '@typescript-eslint/no-explicit-any': 'warn',

            // General rules
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-undef': 'off', // TypeScript handles this better with the globals
        },
    },
    // Configuration specifically for test files
    {
        files: ['**/*.test.{js,jsx,ts,tsx}', '**/tests/**/*'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-console': 'off',
        },
    },
    // Configuration for Cypress files
    {
        files: ['cypress/**/*.{js,jsx,ts,tsx}'],
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'no-console': 'off',
        },
    },
]; 