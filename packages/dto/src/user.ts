/**
 * User DTOs
 * 用户相关的数据传输对象
 */

/**
 * 用户基本信息 DTO
 * 用于登录后返回用户基本信息
 */
export interface UserInfoDto {
  /** 用户唯一标识符 */
  uid: string;
  /** 用户邮箱 */
  email?: string;
  /** 用户昵称 */
  nickname?: string;
  /** 用户头像 URL */
  avatar?: string;
}

/**
 * 更新用户信息 DTO
 * 用于更新用户信息的请求体
 */
export interface UpdateUserDto {
  /** 用户昵称 */
  nickname?: string;
  /** 用户头像 URL */
  avatar?: string;
}

/**
 * 用户个人资料 DTO
 * 包含用户的完整信息，用于获取用户详情
 */
export interface UserProfileDto extends UserInfoDto {
  /** 用户头像 URL */
  avatar?: string;
  /** 手机号码 */
  phone?: string;
  /** 用户状态 (0: 正常, 1: 禁用) */
  status: number;
  /** 创建时间戳 (毫秒) */
  createdAt: number;
  /** 更新时间戳 (毫秒) */
  updatedAt: number;
}

/**
 * 修改密码 DTO
 * 用于修改用户密码的请求体
 */
export interface ChangePasswordDto {
  /** 当前密码 */
  oldPassword: string;
  /** 新密码 */
  newPassword: string;
}
