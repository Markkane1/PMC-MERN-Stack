describe('Payment Dashboard E2E', () => {
    beforeEach(() => {
        cy.login('testuser@example.com', 'password123')
        cy.visit('/payment')
    })

    it('should display payment dashboard', () => {
        cy.get('h1').should('contain', 'Payment Management')
    })

    it('should show payment status', () => {
        cy.get('[data-testid=payment-status]').should('be.visible')
        cy.get('[data-testid=payment-amount]').should('contain', '5000')
    })

    it('should display payment breakdown', () => {
        cy.get('[data-testid=payment-breakdown]').within(() => {
            cy.get('li').should('have.length', 2)
            cy.get('li').first().should('contain', 'Registration Fee')
        })
    })

    it('should show support contact section', () => {
        cy.get('[data-testid=support-section]').should('be.visible')
        cy.get('[data-testid=support-email]').should('contain', 'support@pmc.gov.pk')
    })

    it('should navigate to payment for specific applicant', () => {
        cy.visit('/payment/APP-2024-001')
        cy.get('[data-testid=applicant-id]').should('contain', 'APP-2024-001')
    })

    it('should generate chalan', () => {
        cy.get('[data-testid=generate-chalan-btn]').click()
        cy.get('[data-testid=success-message]').should('contain', 'Chalan generated')
    })
})

describe('Application Form E2E', () => {
    beforeEach(() => {
        cy.login('testuser@example.com', 'password123')
        cy.visit('/application')
    })

    it('should load multi-step form', () => {
        cy.get('[data-testid=form-steps]').should('be.visible')
        cy.get('[data-testid=step-1]').should('have.class', 'active')
    })

    it('should fill personal information step', () => {
        cy.get('input[name=firstName]').type('John')
        cy.get('input[name=lastName]').type('Doe')
        cy.get('input[name=email]').type('john@example.com')
        cy.get('[data-testid=next-btn]').click()
        cy.get('[data-testid=step-2]').should('have.class', 'active')
    })

    it('should progress through all steps', () => {
        // Step 1
        cy.get('input[name=firstName]').type('John')
        cy.get('[data-testid=next-btn]').click()

        // Step 2
        cy.get('[data-testid=step-2]').should('have.class', 'active')
        cy.get('input[name=organization]').type('Test Org')
        cy.get('[data-testid=next-btn]').click()

        // Step 3
        cy.get('[data-testid=step-3]').should('have.class', 'active')
    })

    it('should validate required fields', () => {
        cy.get('[data-testid=next-btn]').click()
        cy.get('[data-testid=error-message]').should('contain', 'required')
    })

    it('should submit application', () => {
        // Fill all steps...
        cy.fillApplicationForm()
        cy.get('[data-testid=submit-btn]').click()
        cy.get('[data-testid=success-message]').should('contain', 'Application submitted')
    })
})

describe('Notifications Page E2E', () => {
    beforeEach(() => {
        cy.login('testuser@example.com', 'password123')
        cy.visit('/notifications')
    })

    it('should display notification center', () => {
        cy.get('[data-testid=notification-center]').should('be.visible')
    })

    it('should filter notifications by tab', () => {
        cy.get('[data-testid=tab-all]').click()
        cy.get('[data-testid=notification-list] li').should('have.length.greaterThan', 0)

        cy.get('[data-testid=tab-unread]').click()
        cy.get('[data-testid=unread-count]').should('contain', /\d+/)
    })

    it('should mark notification as read', () => {
        cy.get('[data-testid=notification-item]').first().within(() => {
            cy.get('[data-testid=mark-read-btn]').click()
        })
        cy.get('[data-testid=success-message]').should('be.visible')
    })

    it('should delete notification', () => {
        cy.get('[data-testid=notification-item]').first().within(() => {
            cy.get('[data-testid=delete-btn]').click()
        })
        cy.get('[data-testid=confirm-delete]').click()
        cy.get('[data-testid=success-message]').should('contain', 'deleted')
    })
})

describe('Settings Page E2E', () => {
    beforeEach(() => {
        cy.login('testuser@example.com', 'password123')
        cy.visit('/settings')
    })

    it('should display settings tabs', () => {
        cy.get('[data-testid=tab-notifications]').should('be.visible')
        cy.get('[data-testid=tab-profile]').should('be.visible')
        cy.get('[data-testid=tab-security]').should('be.visible')
    })

    it('should update notification preferences', () => {
        cy.get('[data-testid=tab-notifications]').click()
        cy.get('[data-testid=email-toggle]').click()
        cy.get('[data-testid=save-btn]').click()
        cy.get('[data-testid=success-message]').should('contain', 'saved')
    })

    it('should update profile information', () => {
        cy.get('[data-testid=tab-profile]').click()
        cy.get('input[name=firstName]').clear().type('Jane')
        cy.get('[data-testid=save-btn]').click()
        cy.get('[data-testid=success-message]').should('be.visible')
    })

    it('should enable 2FA', () => {
        cy.get('[data-testid=tab-security]').click()
        cy.get('[data-testid=enable-2fa-btn]').click()
        cy.get('[data-testid=qr-code]').should('be.visible')
    })
})

describe('GIS Visualization E2E', () => {
    beforeEach(() => {
        cy.login('inspector@example.com', 'password123')
        cy.visit('/gis/visualization')
    })

    it('should display GIS map', () => {
        cy.get('[data-testid=gis-map]').should('be.visible')
    })

    it('should filter markers by type', () => {
        cy.get('[data-testid=filter-type]').select('violation')
        cy.get('[data-testid=marker-count]').should('contain', /\d+/)
    })

    it('should select marker and display details', () => {
        cy.get('[data-testid=map-marker]').first().click()
        cy.get('[data-testid=marker-details]').should('be.visible')
        cy.get('[data-testid=marker-name]').should('not.be.empty')
    })

    it('should display location analytics', () => {
        cy.get('[data-testid=location-analytics]').should('be.visible')
        cy.get('[data-testid=district-card]').should('have.length.greaterThan', 0)
    })

    it('should select district and filter', () => {
        cy.get('[data-testid=district-card]').first().click()
        cy.get('[data-testid=map-marker]').should('be.visible')
    })
})

describe('Analytics Dashboard E2E', () => {
    beforeEach(() => {
        cy.login('admin@example.com', 'password123')
        cy.visit('/analytics/dashboard')
    })

    it('should display analytics dashboard', () => {
        cy.get('[data-testid=analytics-title]').should('contain', 'Analytics')
    })

    it('should show metric cards', () => {
        cy.get('[data-testid=metric-card]').should('have.length.greaterThan', 0)
        cy.get('[data-testid=metric-card]').first().should('contain', /\d+/)
    })

    it('should display charts', () => {
        cy.get('[data-testid=trend-chart]').should('be.visible')
        cy.get('[data-testid=resolution-chart]').should('be.visible')
    })

    it('should filter by date range', () => {
        cy.get('[data-testid=date-from]').type('2024-01-01')
        cy.get('[data-testid=date-to]').type('2024-06-30')
        cy.get('[data-testid=metric-card]').first().should('contain', /\d+/)
    })

    it('should export analytics', () => {
        cy.get('[data-testid=export-btn]').click()
        cy.get('body').should('contain', 'Export')
    })
})
