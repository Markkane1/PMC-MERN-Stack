import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5173',
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        specPattern: 'e2e/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'e2e/support/e2e.ts',
        fixturesFolder: 'e2e/fixtures',
        screenshotOnRunFailure: true,
        video: true,
        viewportWidth: 1280,
        viewportHeight: 720,
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,
    },
    component: {
        devServer: {
            framework: 'react',
            bundler: 'vite',
        },
        specPattern: 'unit/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: false,
    },
})
