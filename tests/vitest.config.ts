import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'setup.ts',
                '**/*.test.ts',
                '**/*.test.tsx',
            ],
        },
        include: ['**/*.test.ts', '**/*.test.tsx'],
        testTimeout: 10000,
    },
    resolve: {
        alias: {
            '@': '../client/src',
        },
    },
})
