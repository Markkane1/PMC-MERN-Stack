const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

export function validatePasswordPolicy(password: unknown): string | null {
  const value = typeof password === 'string' ? password : ''

  if (value.length < MIN_PASSWORD_LENGTH || value.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters long.`
  }

  if (!/[a-z]/.test(value)) {
    return 'Password must include at least one lowercase letter.'
  }

  if (!/[A-Z]/.test(value)) {
    return 'Password must include at least one uppercase letter.'
  }

  if (!/\d/.test(value)) {
    return 'Password must include at least one number.'
  }

  return null
}
