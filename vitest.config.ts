import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'client/src') },
      { find: /^react$/, replacement: path.resolve(__dirname, 'client/node_modules/react') },
      { find: /^react-dom$/, replacement: path.resolve(__dirname, 'client/node_modules/react-dom') },
      {
        find: /^react-dom\/client$/,
        replacement: path.resolve(__dirname, 'client/node_modules/react-dom/client.js'),
      },
      {
        find: /^react-dom\/test-utils$/,
        replacement: path.resolve(__dirname, 'client/node_modules/react-dom/test-utils.js'),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: path.resolve(__dirname, 'client/node_modules/react/jsx-runtime.js'),
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: path.resolve(__dirname, 'client/node_modules/react/jsx-dev-runtime.js'),
      },
      {
        find: /^react-router-dom$/,
        replacement: path.resolve(__dirname, 'client/node_modules/react-router-dom'),
      },
      {
        find: /^react-router$/,
        replacement: path.resolve(__dirname, 'client/node_modules/react-router'),
      },
      {
        find: /^@testing-library\/react$/,
        replacement: path.resolve(__dirname, 'client/node_modules/@testing-library/react'),
      },
      {
        find: /^@testing-library\/dom$/,
        replacement: path.resolve(__dirname, 'client/node_modules/@testing-library/dom'),
      },
      {
        find: /^@testing-library\/jest-dom$/,
        replacement: path.resolve(__dirname, 'client/node_modules/@testing-library/jest-dom'),
      },
      {
        find: /^@testing-library\/jest-dom\/vitest$/,
        replacement: path.resolve(__dirname, 'client/node_modules/@testing-library/jest-dom/vitest.js'),
      },
    ],
  },
  test: {
    include: [
      'tests/unit/**/*.test.{js,jsx,ts,tsx}',
      'tests/unit/**/*.spec.{js,jsx,ts,tsx}',
      'tests/components/**/*.test.{js,jsx,ts,tsx}',
      'tests/components/**/*.spec.{js,jsx,ts,tsx}',
    ],
    environment: 'node',
    environmentMatchGlobs: [['tests/components/**', 'jsdom']],
    setupFiles: ['tests/components/setup.ts'],
    globals: true,
  },
})
