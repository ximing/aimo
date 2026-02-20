import fs from "node:fs";

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

import { ResolvedConfig, LEVEL_MAP } from "./config";

/**
 * 创建 Winston Logger 的 Transports 配置
 * @param config 解析后的配置
 * @returns Winston Transport 数组
 */
export function createTransports(config: ResolvedConfig): winston.transport[] {
  const transports: winston.transport[] = [];

  // 确保日志目录存在
  fs.mkdirSync(config.logDir, { recursive: true });

  // 1. Console Transport - 终端输出
  if (config.enableTerminal) {
    transports.push(
      new winston.transports.Console({
        level: LEVEL_MAP[config.level],
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.printf(({ timestamp, level, message, projectName, ...meta }) => {
            let message_ = `[${timestamp}]`;
            // 添加 projectName 前缀
            if (projectName) {
              message_ += ` [${projectName}]`;
            }
            message_ += ` ${level}: ${message}`;
            // 移除 projectName 避免在元数据中重复显示
            const { projectName: _, ...restMeta } = meta as Record<string, unknown>;
            if (Object.keys(restMeta).length > 0) {
              message_ += ` ${JSON.stringify(restMeta)}`;
            }
            return message_;
          })
        ),
      })
    );
  }

  // 2. File Transport - 按天切割的文件日志
  const fileTransport = new DailyRotateFile({
    level: LEVEL_MAP[config.level],
    dirname: config.logDir,
    filename: "%DATE%", // 统一文件名格式：日期-序列.log
    datePattern: "YYYY-MM-DD",
    maxSize: config.maxSize,
    maxFiles: config.maxFiles,
    extension: ".log",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      // 添加 projectName 字段到日志内容中
      winston.format((info) => {
        info.projectName = config.projectName;
        return info;
      })(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
  });

  // 处理文件创建错误
  fileTransport.on("error", (error: Error) => {
    // 在生产环境中，我们可能想要记录或上报这个错误
    // 但在测试环境中，我们只是忽略它
    console.warn("DailyRotateFile transport error:", error.message);
  });

  transports.push(fileTransport);

  return transports;
}

/**
 * 获取默认的日志格式（用于 Console）
 */
export function getConsoleFormat(): winston.Logform.Format {
  return winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, projectName, ...meta }) => {
      let message_ = `[${timestamp}]`;
      // 添加 projectName 前缀
      if (projectName) {
        message_ += ` [${projectName}]`;
      }
      message_ += ` ${level}: ${message}`;
      // 移除 projectName 避免在元数据中重复显示
      const { projectName: _, ...restMeta } = meta as Record<string, unknown>;
      if (Object.keys(restMeta).length > 0) {
        message_ += ` ${JSON.stringify(restMeta)}`;
      }
      return message_;
    })
  );
}

/**
 * 获取文件日志的格式
 */
export function getFileFormat(): winston.Logform.Format {
  return winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );
}
