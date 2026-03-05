import { defineConfig } from 'vitest/config'

export default defineConfig({
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
