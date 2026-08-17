/**
 * Tests for startup security config validation (JWT_SECRET)
 */

describe('validateSecurityConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('passes when JWT_SECRET is a strong random secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-random-generated-secret-with-32+chars!!';
    const { validateSecurityConfig } = require('../config/security');
    expect(() => validateSecurityConfig()).not.toThrow();
  });

  it('refuses to start in production when JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    const { validateSecurityConfig } = require('../config/security');
    expect(() => validateSecurityConfig()).toThrow(/JWT_SECRET/);
  });

  it('refuses to start in production when JWT_SECRET is a known placeholder', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'your-secret-key-change-in-production';
    const { validateSecurityConfig } = require('../config/security');
    expect(() => validateSecurityConfig()).toThrow(/占位符|placeholder/);
  });

  it('refuses to start in production when JWT_SECRET is shorter than 32 chars', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short-secret';
    const { validateSecurityConfig } = require('../config/security');
    expect(() => validateSecurityConfig()).toThrow(/长度不足|32/);
  });

  it('only warns in development when JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    const { validateSecurityConfig } = require('../config/security');
    expect(() => validateSecurityConfig()).not.toThrow();
  });
});
