/**
 * User DTOs
 * 用户相关的数据传输对象
 */

/**
 * 用户基本信息 DTO
 * 用于登录后返回用户基本信息
 */
export interface UserInfoDto {
  uid: string; // 用户唯一标识符
  email?: string; // 用户邮箱
  nickname?: string; // 用户昵称
  avatar?: string; // 用户头像 URL
}

/**
 * 更新用户信息 DTO
 * 用于更新用户信息的请求体
 */
export interface UpdateUserDto {
  nickname?: string; // 用户昵称
  avatar?: string; // 用户头像 URL
}

/**
 * 用户个人资料 DTO
 * 包含用户的完整信息，用于获取用户详情
 */
export interface UserProfileDto extends UserInfoDto {
  avatar?: string; // 用户头像 URL
  phone?: string; // 手机号码
  status: number; // 用户状态 (0: 正常, 1: 禁用)
  createdAt: number; // 创建时间戳 (毫秒)
  updatedAt: number; // 更新时间戳 (毫秒)
}

/**
 * 修改密码 DTO
 * 用于修改用户密码的请求体
 */
export interface ChangePasswordDto {
  oldPassword: string; // 当前密码
  newPassword: string; // 新密码
}
