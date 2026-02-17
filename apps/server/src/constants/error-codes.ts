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
  CATEGORY_ALREADY_EXISTS: 3001,

  // 附件相关错误: 4000-4999
  FILE_TOO_LARGE: 4000,
  UNSUPPORTED_FILE_TYPE: 4001,
  ATTACHMENT_NOT_FOUND: 4002,
  STORAGE_ERROR: 4003,
  FILE_UPLOAD_ERROR: 4004,
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
  [ErrorCode.CATEGORY_ALREADY_EXISTS]: '类别已存在',
  [ErrorCode.FILE_TOO_LARGE]: '文件过大',
  [ErrorCode.UNSUPPORTED_FILE_TYPE]: '不支持的文件类型',
  [ErrorCode.ATTACHMENT_NOT_FOUND]: '附件不存在',
  [ErrorCode.STORAGE_ERROR]: '存储错误',
  [ErrorCode.FILE_UPLOAD_ERROR]: '文件上传失败',
} as const;
