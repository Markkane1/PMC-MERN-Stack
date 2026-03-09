import { describe, expect, it } from 'vitest'
import { validatePasswordPolicy } from '../../server/src/shared/utils/passwordPolicy'

describe('validatePasswordPolicy', () => {
  it('should return null for a valid password', () => {
    expect(validatePasswordPolicy('ValidPass123')).toBeNull()
  })

  it('should return length error for a password shorter than minimum length', () => {
    expect(validatePasswordPolicy('Aa1aaaa')).toBe('Password must be 8-128 characters long.')
  })

  it('should return length error for a password longer than maximum length', () => {
    const veryLongPassword = `Aa1${'a'.repeat(126)}`
    expect(validatePasswordPolicy(veryLongPassword)).toBe('Password must be 8-128 characters long.')
  })

  it('should return lowercase error when password has no lowercase letters', () => {
    expect(validatePasswordPolicy('UPPERCASE123')).toBe('Password must include at least one lowercase letter.')
  })

  it('should return uppercase error when password has no uppercase letters', () => {
    expect(validatePasswordPolicy('lowercase123')).toBe('Password must include at least one uppercase letter.')
  })

  it('should return number error when password has no numbers', () => {
    expect(validatePasswordPolicy('NoNumbersHere')).toBe('Password must include at least one number.')
  })

  it('should handle non-string values by returning length error', () => {
    expect(validatePasswordPolicy(null)).toBe('Password must be 8-128 characters long.')
    expect(validatePasswordPolicy(undefined)).toBe('Password must be 8-128 characters long.')
    expect(validatePasswordPolicy(12345678)).toBe('Password must be 8-128 characters long.')
    expect(validatePasswordPolicy([])).toBe('Password must be 8-128 characters long.')
  })
})
