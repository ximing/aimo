/**
 * User Token DTOs
 * 用户令牌相关的数据传输对象
 */

export class CreateUserTokenDto {
  /** 令牌名称 */
  name!: string; // 1-100 字符
  /** 过期时间毫秒时间戳，0 = 永不过期 */
  expiresAt!: number;
}

export class UserTokenResponseDto {
  /** 令牌 ID */
  id!: string;
  /** 令牌名称 */
  name!: string;
  /** 令牌密钥，创建时返回原始值 */
  token?: string;
  /** 过期时间毫秒时间戳 */
  expiresAt!: number;
  /** 创建时间毫秒时间戳 */
  createdAt!: number;
  /** 撤销时间毫秒时间戳 */
  revokedAt!: number;
  /** 是否已过期 */
  isExpired!: boolean;
  /** 是否激活 */
  isActive!: boolean;
}

export class UserTokenListResponseDto {
  /** 令牌列表 */
  tokens!: UserTokenResponseDto[];
}
