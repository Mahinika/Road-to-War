import js from '@eslint/js';
import babelParser from '@babel/eslint-parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        requireConfigFile: false
      },
      globals: {
        Phaser: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        Buffer: 'readonly',
        global: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'error'
    }
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', '*.config.js']
  }
];

