import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Log } from "../core";

describe("Log", () => {
  let testLogDir: string;

  beforeEach(() => {
    testLogDir = path.join(os.tmpdir(), `osg-logger-test-${Date.now()}`);
    fs.mkdirSync(testLogDir, { recursive: true });
  });

  afterEach(async () => {
    // 等待一段时间让所有异步操作完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 清理测试文件
    if (fs.existsSync(testLogDir)) {
      try {
        fs.rmSync(testLogDir, { recursive: true, force: true });
      } catch {
        // 忽略删除时的错误
      }
    }
  });

  describe("constructor", () => {
    it("should create logger instance with default options", () => {
      const logger = new Log({ projectName: "test-app" });
      expect(logger).toBeDefined();
      expect(logger.getConfig().projectName).toBe("test-app");
    });

    it("should create logger instance with custom options", () => {
      const logger = new Log({
        projectName: "my-app",
        level: "debug",
        enableTerminal: false,
        logDir: testLogDir,
      });

      const config = logger.getConfig();
      expect(config.projectName).toBe("my-app");
      expect(config.level).toBe("debug");
      expect(config.enableTerminal).toBe(false);
      expect(config.logDir).toBe(testLogDir);
    });

    it("should ensure log directory exists", () => {
      const customDir = path.join(testLogDir, "logs", "app");
      const logger = new Log({
        projectName: "test",
        logDir: customDir,
      });

      expect(fs.existsSync(customDir)).toBe(true);
    });
  });

  describe("logging methods", () => {
    let logger: Log;

    beforeEach(() => {
      logger = new Log({
        projectName: "test-app",
        logDir: testLogDir,
        enableTerminal: false, // 不输出到终端
      });
    });

    afterEach(() => {
      logger.close();
    });

    it("should have info method", () => {
      expect(typeof logger.info).toBe("function");
    });

    it("should have debug method", () => {
      expect(typeof logger.debug).toBe("function");
    });

    it("should have error method", () => {
      expect(typeof logger.error).toBe("function");
    });

    it("should have warn method", () => {
      expect(typeof logger.warn).toBe("function");
    });

    it("should have trace method", () => {
      expect(typeof logger.trace).toBe("function");
    });

    it("should call logging methods without errors", () => {
      expect(() => {
        logger.trace("Trace message");
        logger.debug("Debug message");
        logger.info("Info message");
        logger.warn("Warn message");
        logger.error("Error message");
      }).not.toThrow();
    });

    it("should call logging methods with metadata without errors", () => {
      expect(() => {
        logger.info("User action", { userId: 123, action: "login" });
        logger.error("Connection failed", { ip: "127.0.0.1", code: 500 });
      }).not.toThrow();
    });

    it("should support different log levels", async () => {
      const infoLogger = new Log({
        projectName: "info-test",
        level: "info",
        logDir: testLogDir,
        enableTerminal: false,
      });

      // 这些应该正常工作
      expect(() => {
        infoLogger.info("Should log");
        infoLogger.warn("Should log");
        infoLogger.error("Should log");
      }).not.toThrow();

      infoLogger.close();
    });

    it("should support trace level", async () => {
      const traceLogger = new Log({
        projectName: "trace-test",
        level: "trace",
        logDir: testLogDir,
        enableTerminal: false,
      });

      expect(() => {
        traceLogger.trace("Trace message");
      }).not.toThrow();

      traceLogger.close();
    });
  });

  describe("getConfig", () => {
    it("should return a copy of config", () => {
      const logger = new Log({
        projectName: "test-app",
        level: "debug",
        logDir: testLogDir,
      });

      const config = logger.getConfig();
      config.projectName = "modified";

      const config2 = logger.getConfig();
      expect(config2.projectName).toBe("test-app");
    });
  });

  describe("getWinstonLogger", () => {
    it("should return winston logger instance", () => {
      const logger = new Log({ projectName: "test-app", logDir: testLogDir });
      const winstonLogger = logger.getWinstonLogger();

      expect(winstonLogger).toBeDefined();
      expect(winstonLogger.info).toBeDefined();
      expect(winstonLogger.error).toBeDefined();
    });
  });

  describe("close", () => {
    it("should close logger without error", () => {
      const logger = new Log({
        projectName: "test-app",
        logDir: testLogDir,
      });

      expect(() => {
        logger.close();
      }).not.toThrow();
    });
  });

  describe("multiple instances", () => {
    it("should support multiple logger instances", async () => {
      const dir1 = path.join(testLogDir, "app1");
      const dir2 = path.join(testLogDir, "app2");

      const logger1 = new Log({
        projectName: "app1",
        logDir: dir1,
        enableTerminal: false,
      });

      const logger2 = new Log({
        projectName: "app2",
        logDir: dir2,
        enableTerminal: false,
      });

      expect(() => {
        logger1.info("Message from app1");
        logger2.info("Message from app2");
      }).not.toThrow();

      logger1.close();
      logger2.close();
    });
  });

  describe("default configuration", () => {
    it("should use default logDir in home directory", () => {
      const logger = new Log({
        projectName: "default-test",
      });

      const config = logger.getConfig();
      expect(config.logDir).toContain(".osg");
      expect(config.logDir).toContain("logs");
      expect(config.logDir).toContain("default-test");
    });

    it("should have console enabled by default", () => {
      const logger = new Log({
        projectName: "console-test",
        logDir: testLogDir,
      });

      const config = logger.getConfig();
      expect(config.enableTerminal).toBe(true);
    });

    it("should have info level by default", () => {
      const logger = new Log({
        projectName: "level-test",
        logDir: testLogDir,
      });

      const config = logger.getConfig();
      expect(config.level).toBe("info");
    });
  });
});
