/** @type {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.test.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  resolver: undefined,
};
