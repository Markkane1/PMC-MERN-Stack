const path = require('node:path')

const rootDir = __dirname
const clientTsconfig = path.join(rootDir, 'client', 'tsconfig.eslint.json')
const serverTsconfig = path.join(rootDir, 'server', 'tsconfig.json')

module.exports = {
  root: true,
  ignorePatterns: [
    '.git/',
    'node_modules/',
    'coverage/',
    'test-results/',
    'uploads/',
    '.mongodb-data/',
    'client/build/',
    'client/dist/',
    'server/dist/',
    'tests/node_modules/',
  ],
  overrides: [
    {
      files: ['client/**/*.{ts,tsx,js,jsx}'],
      env: {
        browser: true,
        es2022: true,
        node: true,
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        tsconfigRootDir: rootDir,
        project: [clientTsconfig],
      },
      plugins: ['@typescript-eslint', 'import', 'react', 'react-hooks', 'react-refresh'],
      extends: [
        'eslint:recommended',
        'plugin:import/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
      ],
      settings: {
        react: {
          version: 'detect',
        },
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
          typescript: {
            project: clientTsconfig,
            alwaysTryTypes: true,
          },
        },
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        'import/no-unresolved': 'off',
        'import/no-duplicates': 'off',
        'import/first': 'off',
        'import/default': 'off',
        'import/newline-after-import': 'off',
        'import/no-named-as-default-member': 'off',
        'import/no-named-as-default': 'off',
        'react/jsx-key': 'off',
        'react/no-unescaped-entities': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react/jsx-sort-props': 'off',
        'react-hooks/rules-of-hooks': 'off',
        'react-hooks/exhaustive-deps': 'off',
        'react-refresh/only-export-components': [
          'off',
          { allowConstantExport: true },
        ],
        'no-constant-condition': 'off',
      },
    },
    {
      files: ['server/**/*.{ts,js}'],
      env: {
        node: true,
        es2022: true,
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        tsconfigRootDir: rootDir,
        project: [serverTsconfig],
      },
      plugins: ['@typescript-eslint', 'security'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:security/recommended-legacy',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-unsafe-function-type': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        'no-case-declarations': 'off',
        'no-useless-escape': 'off',
        'prefer-const': 'off',
        'no-async-promise-executor': 'off',
        'no-useless-catch': 'off',
        'no-console': 'off',
      },
    },
  ],
}
