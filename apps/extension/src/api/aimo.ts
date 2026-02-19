/**
 * AIMO API Client
 * Handles authentication and data operations with AIMO backend
 */

import {
  getConfig,
  setConfig,
  clearConfig,
} from '../storage/index.js';
import type {
  LoginRequest,
  LoginResponse,
  CreateMemoRequest,
  CreateMemoResponse,
  UploadAttachmentResponse,
  ApiResponse,
  Config,
} from '../types/index.js';
import { ApiError } from '../types/index.js';

/**
 * Get the base URL from config, ensuring no trailing slash
 */
async function getBaseUrl(): Promise<string> {
  const config = await getConfig();
  if (!config?.url) {
    throw new ApiError('服务器地址未配置，请先配置', undefined, 'CONFIG_MISSING');
  }
  return config.url.replace(/\/$/, '');
}

/**
 * Get the authentication token from config
 */
async function getToken(): Promise<string> {
  const config = await getConfig();
  if (!config?.token) {
    throw new ApiError('未登录，请先登录', undefined, 'TOKEN_MISSING');
  }
  return config.token;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const token = await getToken();

  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  // Don't override Content-Type for FormData (browser will set with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle unauthorized - token expired
    if (response.status === 401) {
      await clearConfig();
      throw new ApiError('登录已过期，请重新登录', 401, 'TOKEN_EXPIRED');
    }

    // Parse JSON response
    let data: ApiResponse<T>;
    try {
      data = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new ApiError(
        `服务器返回格式错误: ${response.statusText}`,
        response.status,
        'INVALID_RESPONSE'
      );
    }

    // Check for API error
    if (!data.success) {
      throw new ApiError(
        data.message || '请求失败',
        response.status,
        'API_ERROR'
      );
    }

    return data.data as T;
  } catch (error) {
    // Re-throw ApiError instances
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('网络错误，请检查服务器地址或网络连接', undefined, 'NETWORK_ERROR');
    }

    throw new ApiError(
      `请求失败: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Login to AIMO server
 * @param email - User email
 * @param password - User password
 * @returns Login response with token and user info
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const baseUrl = (await getBaseUrl()).replace(/\/$/, '');

  const loginData: LoginRequest = { email, password };

  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    let data: ApiResponse<LoginResponse>;
    try {
      data = (await response.json()) as ApiResponse<LoginResponse>;
    } catch {
      throw new ApiError(
        `服务器返回格式错误: ${response.statusText}`,
        response.status,
        'INVALID_RESPONSE'
      );
    }

    if (!data.success) {
      // Map specific error messages to Chinese
      const message = data.message || '';
      if (message.toLowerCase().includes('user not found')) {
        throw new ApiError('用户不存在', response.status, 'USER_NOT_FOUND');
      }
      if (message.toLowerCase().includes('password')) {
        throw new ApiError('密码错误', response.status, 'PASSWORD_ERROR');
      }
      throw new ApiError(message || '登录失败', response.status, 'LOGIN_FAILED');
    }

    if (!data.data?.token) {
      throw new ApiError('登录响应缺少令牌', undefined, 'MISSING_TOKEN');
    }

    // Save config with token
    await setConfig(baseUrl, data.data.token, data.data.user.nickname || data.data.user.email);

    return data.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('无法连接到服务器，请检查地址是否正确', undefined, 'CONNECTION_ERROR');
    }

    throw new ApiError(
      `登录失败: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      'LOGIN_ERROR'
    );
  }
}

/**
 * Test server connection without authentication
 * @param url - Server URL to test
 * @returns True if server is reachable
 */
export async function testConnection(url: string): Promise<boolean> {
  const cleanUrl = url.replace(/\/$/, '');

  try {
    // Try to fetch the root or a health endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${cleanUrl}/api/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    // If health endpoint doesn't exist, try a HEAD request to root
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(cleanUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 404; // 404 means server is up but endpoint not found
    } catch {
      return false;
    }
  }
}

/**
 * Create a new memo
 * @param content - Memo content
 * @param sourceUrl - Source URL
 * @param attachmentIds - Optional array of attachment IDs
 * @returns Created memo
 */
export async function createMemo(
  content: string,
  sourceUrl: string,
  attachmentIds?: string[]
): Promise<CreateMemoResponse> {
  const memoData: CreateMemoRequest = {
    content: formatContentWithSource(content, sourceUrl),
    type: 'text',
    attachments: attachmentIds,
  };

  return apiRequest<CreateMemoResponse>('/api/v1/memos', {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
}

/**
 * Upload an attachment
 * @param file - File to upload (Blob or File)
 * @param filename - Original filename
 * @param onProgress - Optional callback for upload progress (simulated since fetch doesn't support real progress)
 * @returns Upload response with attachment info
 */
export async function uploadAttachment(
  file: Blob,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<UploadAttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file, filename);

  const baseUrl = await getBaseUrl();
  const token = await getToken();

  const url = `${baseUrl}/api/v1/attachments/upload`;

  // Simulate progress updates since fetch doesn't support real upload progress
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  if (onProgress) {
    let progress = 0;
    progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90; // Cap at 90% until complete
      onProgress(Math.min(Math.round(progress), 90));
    }, 200);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    // Clear progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    // Set to 100% on completion
    if (onProgress) {
      onProgress(100);
    }

    // Handle unauthorized - token expired
    if (response.status === 401) {
      await clearConfig();
      throw new ApiError('登录已过期，请重新登录', 401, 'TOKEN_EXPIRED');
    }

    let data: ApiResponse<UploadAttachmentResponse>;
    try {
      data = (await response.json()) as ApiResponse<UploadAttachmentResponse>;
    } catch {
      throw new ApiError(
        `服务器返回格式错误: ${response.statusText}`,
        response.status,
        'INVALID_RESPONSE'
      );
    }

    if (!data.success) {
      throw new ApiError(
        data.message || '上传失败',
        response.status,
        'UPLOAD_ERROR'
      );
    }

    return data.data as UploadAttachmentResponse;
  } catch (error) {
    // Clear progress interval on error
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('网络错误，上传失败', undefined, 'NETWORK_ERROR');
    }

    throw new ApiError(
      `上传失败: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      'UPLOAD_ERROR'
    );
  }
}

/**
 * Download an image from URL and upload it to AIMO
 * @param imageUrl - URL of the image to download and upload
 * @param onProgress - Optional callback for upload progress
 * @returns Attachment ID if successful
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Download the image
  const imageBlob = await downloadImage(imageUrl);

  // Generate filename from URL
  const urlObj = new URL(imageUrl);
  const pathname = urlObj.pathname;
  let filename = pathname.substring(pathname.lastIndexOf('/') + 1);

  // Ensure filename has an extension
  if (!filename || !filename.includes('.')) {
    const ext = imageBlob.type?.split('/')[1] || 'jpg';
    filename = `image-${Date.now()}.${ext}`;
  }

  // Decode URL-encoded filename
  try {
    filename = decodeURIComponent(filename);
  } catch {
    // Keep original if decoding fails
  }

  // Upload the image
  const response = await uploadAttachment(imageBlob, filename, onProgress);

  return response.attachment.attachmentId;
}

/**
 * Download an image from URL and convert to Blob
 * @param imageUrl - URL of the image to download
 * @returns Blob of the image
 */
export async function downloadImage(imageUrl: string): Promise<Blob> {
  try {
    const response = await fetch(imageUrl, {
      credentials: 'omit', // Don't send cookies for cross-origin images
    });

    if (!response.ok) {
      throw new ApiError(
        `无法下载图片: ${response.statusText}`,
        response.status,
        'DOWNLOAD_ERROR'
      );
    }

    return await response.blob();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      `下载图片失败: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      'DOWNLOAD_ERROR'
    );
  }
}

/**
 * Format content with source URL appended
 * @param content - Original content
 * @param sourceUrl - Source URL
 * @returns Formatted content
 */
function formatContentWithSource(content: string, sourceUrl: string): string {
  if (!sourceUrl) return content;
  return `${content}\n\n[来源](${sourceUrl})`;
}

/**
 * Check if user is logged in
 * @returns True if config exists with token
 */
export async function isLoggedIn(): Promise<boolean> {
  try {
    const config = await getConfig();
    return !!(config?.url && config?.token);
  } catch {
    return false;
  }
}

/**
 * Get current config
 * @returns Config or null
 */
export async function getCurrentConfig(): Promise<Config | null> {
  return getConfig();
}

/**
 * Logout - clear stored config
 */
export async function logout(): Promise<void> {
  await clearConfig();
}
