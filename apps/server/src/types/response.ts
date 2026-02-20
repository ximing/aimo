export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export interface PaginationParameters {
  page: number;
  pageSize: number;
}

export interface PaginationResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
