import request from '@/utils/request';
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  ShareNoteResponse,
  ImportResult,
  ExportOptions,
  PaginatedResponse,
  Attachment,
} from './types';

interface GetNotesParams {
  page?: number;
  pageSize?: number;
  sortBy?: 'newest' | 'oldest';
  tag?: string;
  search?: string;
  searchMode?: 'similarity' | 'fulltext';
  startDate?: string;
  endDate?: string;
}

export async function getNotes(params: GetNotesParams = {}) {
  return (await request.get<PaginatedResponse<Note>>('/notes', { params }))
    .data;
}

export async function createNote(
  data: CreateNoteInput & { attachments?: Attachment[] }
): Promise<Note> {
  const response = await request.post('/notes', data);
  return response.data;
}

export async function updateNote(
  id: number,
  data: UpdateNoteInput & { attachments?: Attachment[] }
): Promise<Note> {
  const response = await request.put(`/notes/${id}`, data);
  return response.data;
}

export async function deleteNote(id: number) {
  return (await request.delete<void>(`/notes/${id}`)).data;
}

export async function getNoteByShareToken(token: string) {
  return (await request.get<Note>(`/notes/shared/${token}`)).data;
}

export async function shareNote(id: number) {
  return (await request.post<ShareNoteResponse>(`/notes/${id}/share`)).data;
}

export async function getSharedNote(token: string) {
  return (await request.get<Note>(`/notes/share/${token}`)).data;
}

export async function importNotes(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return (
    await request.post<ImportResult>('/notes/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  ).data;
}

export async function exportNotes(options: ExportOptions) {
  return (
    await request.get('/notes/export', {
      params: options,
      responseType: 'blob',
    })
  ).data;
}

interface HeatmapData {
  date: string;
  count: number;
}

export async function getHeatmapData(
  startDate: string,
  endDate: string
): Promise<HeatmapData[]> {
  return (
    await request.get<HeatmapData[]>('/notes/stats/heatmap', {
      params: {
        startDate,
        endDate,
      },
    })
  ).data;
}

/**
 * 上传附件
 * @param formData 包含文件的 FormData 对象
 * @returns 上传成功的附件信息数组
 */
export async function uploadAttachments(
  formData: FormData
): Promise<Attachment[]> {
  const response = await request.post('/notes/attachments', formData, {
    headers: {
      // 不设置 Content-Type，让浏览器自动设置包含 boundary 的值
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}
