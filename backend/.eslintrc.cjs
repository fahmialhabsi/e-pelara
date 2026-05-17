module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'tmp/',
    'uploads/',
    'storage/',
    'coverage/',
    '*.log',
  ],
  rules: {
    eqeqeq: 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'warn',
    'no-duplicate-imports': 'error',
    'object-shorthand': 'warn',
    'no-else-return': 'warn',
    'consistent-return': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }],
    'linebreak-style': 'off',
  },
}
