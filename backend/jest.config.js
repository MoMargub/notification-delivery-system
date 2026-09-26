/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  setupFiles: ['<rootDir>/tests/env.ts'],
  testTimeout: 30000,
};
