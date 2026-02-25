export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/__tests__/**'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          module: 'commonjs',
        },
        useESM: false,
      },
    ],
  },
  extensionsToTreatAsEsm: [],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 45,
      lines: 55,
      statements: 55,
    },
  },
  testTimeout: 10_000,
};
