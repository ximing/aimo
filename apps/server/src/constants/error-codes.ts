export const ErrorCode = {
  // 系统级别错误: 1-99
  SUCCESS: 0,
  SYSTEM_ERROR: 1,
  PARAMS_ERROR: 2,
  NOT_FOUND: 3,
  UNAUTHORIZED: 4,
  FORBIDDEN: 5,

  // 用户相关错误: 1000-1999
  USER_NOT_FOUND: 1000,
  USER_ALREADY_EXISTS: 1001,
  PASSWORD_ERROR: 1002,
  TOKEN_EXPIRED: 1003,

  // 数据库相关错误: 2000-2999
  DB_ERROR: 2000,
  DB_CONNECT_ERROR: 2001,

  // 业务相关错误: 3000-3999
  BUSINESS_ERROR: 3000,
} as const;

export const ErrorMessage = {
  [ErrorCode.SUCCESS]: '操作成功',
  [ErrorCode.SYSTEM_ERROR]: '系统错误',
  [ErrorCode.PARAMS_ERROR]: '参数错误',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.PASSWORD_ERROR]: '密码错误',
  [ErrorCode.TOKEN_EXPIRED]: 'token已过期',
  [ErrorCode.DB_ERROR]: '数据库错误',
  [ErrorCode.DB_CONNECT_ERROR]: '数据库连接错误',
  [ErrorCode.BUSINESS_ERROR]: '业务错误',
} as const;
