/**
 * Common Response DTOs
 */

export interface ApiResponseDto<T = any> {
  code: number;
  msg: string;
  data: T | null;
}

export interface ApiErrorDto {
  code: number;
  msg: string;
  data: null;
}

export interface ApiSuccessDto<T = any> {
  code: number;
  msg: string;
  data: T;
}
