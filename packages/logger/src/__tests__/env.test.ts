import { getEnvValue as getEnvironmentValue, getEnvBool as getEnvironmentBool } from "../utils/env";

describe("Environment Utilities", () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    // 清除 process.env 中与测试相关的变量
    delete process.env.TEST_VAR;
    delete process.env.TEST_BOOL;
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  describe("getEnvValue", () => {
    it("should return env value if exists", () => {
      process.env.TEST_VAR = "test-value";
      expect(getEnvironmentValue("TEST_VAR")).toBe("test-value");
    });

    it("should return undefined if env value does not exist", () => {
      expect(getEnvironmentValue("NON_EXISTENT_VAR")).toBeUndefined();
    });

    it("should return empty string if env value is empty", () => {
      process.env.TEST_VAR = "";
      expect(getEnvironmentValue("TEST_VAR")).toBe("");
    });
  });

  describe("getEnvBool", () => {
    it('should return true for "true" value', () => {
      process.env.TEST_BOOL = "true";
      expect(getEnvironmentBool("TEST_BOOL")).toBe(true);
    });

    it('should return true for "1" value', () => {
      process.env.TEST_BOOL = "1";
      expect(getEnvironmentBool("TEST_BOOL")).toBe(true);
    });

    it('should return true for "yes" value', () => {
      process.env.TEST_BOOL = "yes";
      expect(getEnvironmentBool("TEST_BOOL")).toBe(true);
    });

    it("should return false for other values", () => {
      process.env.TEST_BOOL = "false";
      expect(getEnvironmentBool("TEST_BOOL")).toBe(false);
    });

    it("should return default value if env value does not exist", () => {
      expect(getEnvironmentBool("NON_EXISTENT_VAR", true)).toBe(true);
      expect(getEnvironmentBool("NON_EXISTENT_VAR", false)).toBe(false);
    });

    it("should return default false if not specified", () => {
      expect(getEnvironmentBool("NON_EXISTENT_VAR")).toBe(false);
    });
  });
});
