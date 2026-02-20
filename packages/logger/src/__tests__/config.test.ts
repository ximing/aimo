import os from "node:os";
import path from "node:path";

import { resolveConfig, LEVEL_MAP } from "../config";

describe("Config", () => {
  describe("resolveConfig", () => {
    it("should throw error when projectName is missing", () => {
      expect(() => {
        resolveConfig({} as any);
      }).toThrow("projectName is required");
    });

    it("should use default values when options are minimal", () => {
      const config = resolveConfig({ projectName: "test-app" });

      expect(config.projectName).toBe("test-app");
      expect(config.level).toBe("info");
      expect(config.enableTerminal).toBe(true);
      expect(config.maxSize).toBe("10m");
      expect(config.maxFiles).toBe("14d");
    });

    it("should use provided options", () => {
      const config = resolveConfig({
        projectName: "my-app",
        level: "debug",
        enableTerminal: false,
        maxSize: "20m",
        maxFiles: "30d",
      });

      expect(config.projectName).toBe("my-app");
      expect(config.level).toBe("debug");
      expect(config.enableTerminal).toBe(false);
      expect(config.maxSize).toBe("20m");
      expect(config.maxFiles).toBe("30d");
    });

    it("should generate default logDir with projectName", () => {
      const config = resolveConfig({ projectName: "test-app" });

      const expectedPath = path.join(os.homedir(), ".osg", "logs", "test-app");
      expect(config.logDir).toBe(expectedPath);
    });

    it("should use custom logDir if provided", () => {
      const customDir = "/custom/log/path";
      const config = resolveConfig({
        projectName: "test-app",
        logDir: customDir,
      });

      expect(config.logDir).toBe(customDir);
    });

    it("should throw error for invalid log level", () => {
      expect(() => {
        resolveConfig({
          projectName: "test-app",
          level: "invalid" as any,
        });
      }).toThrow("Invalid log level");
    });

    it("should handle all valid log levels", () => {
      const levels: Array<"trace" | "debug" | "info" | "warn" | "error"> = [
        "trace",
        "debug",
        "info",
        "warn",
        "error",
      ];

      for (const level of levels) {
        const config = resolveConfig({
          projectName: "test-app",
          level,
        });
        expect(config.level).toBe(level);
      }
    });

    it("should strip trailing slash from logDir", () => {
      const config = resolveConfig({
        projectName: "test-app",
        logDir: "/tmp/logs/",
      });

      expect(config.logDir).toBe("/tmp/logs");
    });
  });

  describe("LEVEL_MAP", () => {
    it("should map all custom levels to Winston levels", () => {
      expect(LEVEL_MAP.trace).toBe("silly");
      expect(LEVEL_MAP.debug).toBe("debug");
      expect(LEVEL_MAP.info).toBe("info");
      expect(LEVEL_MAP.warn).toBe("warn");
      expect(LEVEL_MAP.error).toBe("error");
    });
  });
});
