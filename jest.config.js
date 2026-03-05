/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.[jt]s', '**/*.spec.[jt]s'],
  clearMocks: true,
  verbose: true,
}
