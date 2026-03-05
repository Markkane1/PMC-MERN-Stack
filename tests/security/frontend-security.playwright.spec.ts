import { test, expect } from '@playwright/test'

const APP_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

test.describe('S6 Frontend Security (Playwright)', () => {
  test('blocks open redirect attempts via redirectUrl after login', async ({ page }) => {
    await page.route('**/api/accounts/generate-captcha/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          captcha_image:
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
          captcha_token: 'mock-captcha-token',
        }),
      })
    })

    await page.route('**/api/accounts/login/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access: 'mock-access-token',
          refresh: 'mock-refresh-token',
          user: {
            username: 'security.user@test.local',
            groups: ['APPLICANT'],
          },
        }),
      })
    })

    await page.goto(`${APP_URL}/sign-in?redirectUrl=https://evil.com`)

    await page.getByPlaceholder('Username').fill('security.user@test.local')
    await page.getByPlaceholder('Password').fill('TestPass123!')
    await page.getByPlaceholder('Enter CAPTCHA text').fill('ABCDE')
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.waitForTimeout(1200)

    expect(page.url()).not.toContain('https://evil.com')
    expect(new URL(page.url()).origin).toBe(new URL(APP_URL).origin)
  })

  test('refuses iframe embedding (clickjacking protection)', async ({ page }) => {
    const response = await page.request.get(`${APP_URL}/api/accounts/generate-captcha/`)
    const xFrameOptions = response.headers()['x-frame-options']
    const csp = response.headers()['content-security-policy'] || ''

    expect(Boolean(xFrameOptions) || /frame-ancestors/i.test(csp)).toBe(true)

    await page.setContent(
      `<html><body><iframe id="victim" src="${APP_URL}/pub" width="1200" height="800"></iframe></body></html>`
    )
    await page.waitForTimeout(1500)

    const frameState = await page.$eval('#victim', (element) => {
      const frame = element as HTMLIFrameElement
      try {
        return {
          canAccess: true,
          href: frame.contentWindow?.location.href || '',
        }
      } catch {
        return {
          canAccess: false,
          href: '',
        }
      }
    })

    if (frameState.canAccess) {
      expect(frameState.href).toBe('about:blank')
    }
  })
})
