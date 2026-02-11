import { ApiResponse } from '../types/response.js';
import { ErrorCode, ErrorMessage } from '../constants/error-codes.js';

export class ResponseUtil {
  static success<T>(data: T, msg: string = ErrorMessage[ErrorCode.SUCCESS]): ApiResponse<T> {
    return {
      code: ErrorCode.SUCCESS,
      msg,
      data,
    };
  }

  static error(code: number = ErrorCode.SYSTEM_ERROR, msg?: string): ApiResponse<null> {
    return {
      code,
      msg: msg || ErrorMessage[code] || ErrorMessage[ErrorCode.SYSTEM_ERROR],
      data: null,
    };
  }
}
