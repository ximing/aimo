/**
 * Memo DTOs
 */

export interface CreateMemoDto {
  content: string;
}

export interface UpdateMemoDto {
  content: string;
}

export interface MemoDto {
  id?: number;
  memoId: string;
  uid: string;
  content: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoSearchOptionsDto {
  uid: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface MemoVectorSearchDto {
  query: string;
  limit?: number;
  threshold?: number;
}

export interface PaginatedMemoDto {
  items: MemoDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
