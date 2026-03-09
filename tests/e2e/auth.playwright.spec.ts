import { expect, test } from '@playwright/test'

const captchaResponse = {
  captcha_image:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHg9IjEwIiB5PSIyMCI+Q0FQVENIQTwvdGV4dD48L3N2Zz4=',
  captcha_token: 'mock-captcha-token',
}

async function mockUnauthenticatedApi(page: import('@playwright/test').Page) {
  await page.route('**/api/accounts/profile/**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })

  await page.route('**/api/accounts/generate-captcha/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(captchaResponse),
    })
  })

  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })
}

async function mockAuthenticatedSignIn(page: import('@playwright/test').Page) {
  let signedIn = false

  await page.route('**/api/accounts/profile/**', async (route) => {
    await route.fulfill({
      status: signedIn ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(
        signedIn
          ? {
              id: 'user-1',
              username: 'testuser@test.com',
              email: 'testuser@test.com',
              groups: ['APPLICANT'],
            }
          : { message: 'Unauthorized' },
      ),
    })
  })

  await page.route('**/api/accounts/generate-captcha/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(captchaResponse),
    })
  })

  await page.route('**/api/accounts/login/**', async (route) => {
    signedIn = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: {
          userId: 'user-1',
          userName: 'testuser',
          email: 'testuser@test.com',
          authority: ['APPLICANT'],
        },
      }),
    })
  })

  await page.route('**/api/pmc/user-groups/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ name: 'APPLICANT' }]),
    })
  })

  await page.route('**/api/accounts/role-dashboard/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mappings: {
          APPLICANT: '/home',
        },
      }),
    })
  })

  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
}

test.describe('Authentication flows', () => {
  test('renders the sign-in form and shows inline validation errors', async ({
    page,
  }) => {
    await mockUnauthenticatedApi(page)

    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })

    await expect(page.getByPlaceholder('Username')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
    await expect(page.getByPlaceholder('Enter CAPTCHA text')).toBeVisible()

    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText('Please enter your email')).toBeVisible()
    await expect(page.getByText('Please enter your password')).toBeVisible()
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test('redirects an unauthenticated visitor away from protected routes', async ({
    page,
  }) => {
    await mockUnauthenticatedApi(page)

    await page.goto('/application', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/pub(\?|$)/)
  })

  test('ignores an external redirect target once the session resolves as authenticated', async ({
    page,
  }) => {
    await mockAuthenticatedSignIn(page)

    await page.goto('/sign-in?redirectUrl=https://evil.com', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page).toHaveURL(/\/home$/)
    expect(new URL(page.url()).origin).toBe('http://127.0.0.1:4173')
  })
})
