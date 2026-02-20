import os from "node:os";
import path from "node:path";

import { getEnvValue as getEnvironmentValue } from "./utils/env";

/**
 * 日志元数据类型
 * 支持以下格式：
 * - 对象: { key: value } - 将被 JSON 序列化
 * - Error: Error 实例 - 将包含堆栈信息
 * - 基本类型: string, number, boolean 等
 */
export type LogMetadata =
  | Record<string, unknown>
  | Error
  | string
  | number
  | boolean
  | null
  | undefined;

/**
 * Logger 配置选项接口
 */
export interface LoggerOptions {
  /**
   * 项目名称，用于日志文件名和目录名
   * 必填
   */
  projectName: string;

  /**
   * 日志级别
   * 默认: 'info'
   * 环境变量: OSG_LOGGER_LEVEL
   */
  level?: "trace" | "debug" | "info" | "warn" | "error";

  /**
   * 日志存储根目录
   * 默认: ~/.aimo/logs/
   * 环境变量: OSG_LOGGER_DIR
   */
  logDir?: string;

  /**
   * 是否输出到终端
   * 默认: true
   * 环境变量: OSG_LOGGER_CONSOLE (true/false)
   */
  enableTerminal?: boolean;

  /**
   * 单个日志文件最大大小
   * 默认: '10m'
   */
  maxSize?: string;

  /**
   * 日志文件保留策略 (天数或数量)
   * 默认: '14d'
   */
  maxFiles?: string | number;
}

/**
 * 解析后的配置
 */
export interface ResolvedConfig {
  projectName: string;
  level: "trace" | "debug" | "info" | "warn" | "error";
  logDir: string;
  enableTerminal: boolean;
  maxSize: string;
  maxFiles: string | number;
}

/**
 * 日志级别映射到 Winston 级别
 * Winston 级别: silly, debug, verbose, info, warn, error
 * 我们的级别: trace, debug, info, warn, error
 */
export const LEVEL_MAP: Record<string, string> = {
  trace: "silly",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

/**
 * 默认配置值
 */
const DEFAULT_CONFIG: Omit<ResolvedConfig, "projectName" | "logDir"> = {
  level: "info",
  enableTerminal: true,
  maxSize: "10m",
  maxFiles: "14d",
};

/**
 * 配置解析逻辑
 * 优先级: options > process.env > default
 */
export function resolveConfig(options: LoggerOptions): ResolvedConfig {
  if (!options.projectName) {
    throw new Error("projectName is required in LoggerOptions");
  }

  const projectName = options.projectName;

  // 日志级别解析
  const level = (options.level ||
    (getEnvironmentValue("OSG_LOGGER_LEVEL") as
      | "trace"
      | "debug"
      | "info"
      | "warn"
      | "error"
      | undefined) ||
    DEFAULT_CONFIG.level) as "trace" | "debug" | "info" | "warn" | "error";

  // 验证日志级别
  if (!["trace", "debug", "info", "warn", "error"].includes(level)) {
    throw new Error(`Invalid log level: ${level}`);
  }

  // 日志目录解析 - 统一存储在根目录，不再按 projectName 分子目录
  let logDir =
    options.logDir ||
    getEnvironmentValue("OSG_LOGGER_DIR") ||
    path.join(os.homedir(), ".aimo", "logs");

  // 确保路径末尾没有斜杠
  logDir = logDir.replace(/\/$/, "");

  // 是否输出到终端
  const enableTerminal =
    options.enableTerminal === undefined
      ? getEnvironmentValue("OSG_LOGGER_ENABLE_TERMINAL")
      : options.enableTerminal;

  const consoleOutput =
    enableTerminal === false || enableTerminal === "false" ? false : true;

  // 日志文件大小限制
  const maxSize = options.maxSize || DEFAULT_CONFIG.maxSize;

  // 日志文件保留策略
  const maxFiles =
    options.maxFiles === undefined ? DEFAULT_CONFIG.maxFiles : options.maxFiles;

  return {
    projectName,
    level,
    logDir,
    enableTerminal: consoleOutput,
    maxSize,
    maxFiles,
  };
}
