export interface User {
  id: number;
  email: string;
  name: string | null;
  role: "admin" | "user";
  createdAt: string;
}

export interface Note {
  id: number;
  userId: number;
  content: string;
  isPublic: boolean;
  shareToken?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  vectorEmbedding?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface CreateNoteInput {
  content: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateNoteInput {
  content?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  password?: string;
}

export interface ShareNoteResponse {
  shareUrl: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  theme: "light" | "dark";
  language: string;
}

export interface UserListItem extends User {
  isActive: boolean;
  lastLoginAt?: string;
}

export interface TagStats {
  name: string;
  count: number;
  lastUsed: string;
}

export interface SystemStats {
  totalUsers: number;
  totalNotes: number;
  totalTags: number;
  activeUsers: number;
}

export interface UpdateUserInput {
  name?: string;
  role?: "admin" | "user";
  isActive?: boolean;
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors?: string[];
}

export interface ExportOptions {
  format: "json" | "csv" | "xlsx";
  includePrivate?: boolean;
  tags?: string[];
}

export interface SearchNoteInput {
  q: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  notes: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}
