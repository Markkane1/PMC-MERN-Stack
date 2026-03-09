/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.[jt]s', '**/*.spec.[jt]s'],
  maxWorkers: 1,
  testTimeout: 120000,
  clearMocks: true,
  verbose: true,
}
