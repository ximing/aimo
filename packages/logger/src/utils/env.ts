/**
 * 从环境变量中读取值
 * @param key 环境变量名
 * @returns 环境变量值，如果不存在则返回 undefined
 */
export function getEnvValue(key: string): string | undefined {
  return process.env[key];
}

/**
 * 从环境变量中读取布尔值
 * @param key 环境变量名
 * @param defaultValue 默认值
 * @returns 布尔值
 */
export function getEnvBool(
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value === "true" || value === "1" || value === "yes";
}
