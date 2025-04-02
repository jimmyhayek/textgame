// eslint.config.mjs
import eslintJs from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  eslintJs.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'rollup.config.js',
      'jest.config.js'
    ]
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        // Přidáno pro vyřešení 'console is not defined'
        console: 'readonly',
        // Další globální proměnné, které mohou být potřeba
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        Promise: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'prettier': prettierPlugin
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off'
    }
  }
];