import { testUsers } from '../../fixtures/mockData'
// Import Cypress for type declarations only
import type { Cypress } from 'cypress';

// Custom command to login
Cypress.Commands.add('login', (email: string, password: string) => {
    cy.visit('/login')
    cy.get('input[name=email]').type(email)
    cy.get('input[name=password]').type(password)
    cy.get('button[type=submit]').click()
    cy.url().should('include', '/home')
})

// Custom command to logout
Cypress.Commands.add('logout', () => {
    cy.get('[data-testid=user-menu]').click()
    cy.get('[data-testid=logout-btn]').click()
    cy.url().should('include', '/login')
})

// Custom command to fill application form
Cypress.Commands.add('fillApplicationForm', () => {
    // Step 1: Personal Info
    cy.get('input[name=firstName]').type('John')
    cy.get('input[name=lastName]').type('Doe')
    cy.get('input[name=email]').type('john@example.com')
    cy.get('input[name=phone]').type('+92-300-1234567')
    cy.get('[data-testid=next-btn]').click()

    // Step 2: Details
    cy.get('input[name=organization]').type('Test Organization')
    cy.get('select[name=district]').select('Lahore')
    cy.get('select[name=type]').select('facility')
    cy.get('[data-testid=next-btn]').click()

    // Step 3: Documents (if applicable)
    if (cy.get('input[name=documents]')) {
        cy.get('[data-testid=next-btn]').click()
    }

    // Step 4: Payment
    if (cy.get('[data-testid=payment-section]')) {
        cy.get('[data-testid=next-btn]').click()
    }

    // Step 5: Review
    cy.get('[data-testid=review-section]').should('be.visible')
})

// Custom command to wait for API
Cypress.Commands.add('waitForAPI', (route: string) => {
    cy.intercept('GET', route).as(`${route}Request`)
    cy.wait(`@${route}Request`)
})

// Custom command to check notification
Cypress.Commands.add('checkNotification', (message: string) => {
    cy.get('[data-testid=toast-notification]').should('contain', message)
})

// Intercept API calls for testing
beforeEach(() => {
    // Intercept authentication
    cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
            success: true,
            user: {
                id: 'user-123',
                name: 'Test User',
                email: 'testuser@example.com',
                authority: ['User'],
            },
            token: 'test-token-123',
        },
    }).as('login')

    // Intercept payment APIs
    cy.intercept('GET', '/api/payment/status/*', {
        statusCode: 200,
        body: {
            data: {
                applicantId: 'APP-2024-001',
                status: 'pending',
                amount: 5000,
                currency: 'PKR',
            },
        },
    }).as('getPaymentStatus')

    // Intercept notification APIs
    cy.intercept('GET', '/api/alerts/notifications', {
        statusCode: 200,
        body: {
            data: [
                {
                    id: '1',
                    title: 'Test Alert',
                    message: 'This is a test alert',
                    priority: 'high',
                    read: false,
                },
            ],
        },
    }).as('getNotifications')

    // Intercept analytics APIs
    cy.intercept('GET', '/api/analytics/locations', {
        statusCode: 200,
        body: {
            data: [
                {
                    id: '1',
                    lat: 31.5497,
                    lon: 74.3436,
                    name: 'Test Facility',
                    type: 'facility',
                },
            ],
        },
    }).as('getLocations')
})

declare global {
    namespace Cypress {
        interface Chainable {
            login(email: string, password: string): Chainable<void>
            logout(): Chainable<void>
            fillApplicationForm(): Chainable<void>
            waitForAPI(route: string): Chainable<void>
            checkNotification(message: string): Chainable<void>
        }
    }
}
