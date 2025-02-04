import request from '@/utils/request';

interface ImportResponse {
  success: boolean;
  imported: number;
}

export async function importNotes(formData: FormData) {
  return (
    await request.post<ImportResponse>('/system/import', formData, {
      headers: {
        // 移除默认的 Content-Type，让浏览器自动设置正确的 multipart/form-data
        'Content-Type': undefined,
      },
    })
  ).data;
}

export async function getSystemInfo() {
  return (
    await request.get<{
      version: string;
      nodeVersion: string;
      platform: string;
      uptime: number;
      memoryUsage: {
        total: number;
        free: number;
        used: number;
      };
      cpuUsage: number[];
    }>('/system/info')
  ).data;
}

export async function getSystemStats() {
  return (
    await request.get<{
      totalUsers: number;
      totalNotes: number;
      totalAttachments: number;
      storageUsage: number;
    }>('/system/stats')
  ).data;
}

export async function createBackup() {
  return (await request.post<{ success: boolean }>('/system/backups')).data;
}

export async function listBackups() {
  return (
    await request.get<
      Array<{
        filename: string;
        size: number;
        createdAt: string;
      }>
    >('/system/backups')
  ).data;
}
