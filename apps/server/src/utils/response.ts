import { ErrorCode, ErrorMessage } from '../constants/error-codes.js';
import { ApiResponse } from '../types/response.js';

export const ResponseUtil = {
  success<T>(data: T, message: string = ErrorMessage[ErrorCode.SUCCESS]): ApiResponse<T> {
    return {
      code: ErrorCode.SUCCESS,
      msg: message,
      data,
    };
  },

  error(code: number = ErrorCode.SYSTEM_ERROR, message?: string): ApiResponse<null> {
    return {
      code,
      msg: message || ErrorMessage[code] || ErrorMessage[ErrorCode.SYSTEM_ERROR],
      data: null,
    };
  },
};
