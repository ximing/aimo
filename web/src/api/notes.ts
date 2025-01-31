import request from "@/utils/request";
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  ShareNoteResponse,
  ImportResult,
  ExportOptions,
  SearchNoteInput,
} from "./types";

interface GetNotesParams {
  page?: number;
  pageSize?: number;
  sortBy?: "newest" | "oldest";
}

export async function getNotes(params: GetNotesParams = {}): Promise<Note[]> {
  const { page = 1, pageSize = 20, sortBy = "newest" } = params;

  const notes = await request.get("/notes", {
    params: {
      page,
      pageSize,
      sortBy,
    },
  });
  return notes;
}

export function createNote(data: CreateNoteInput) {
  return request.post<Note>("/notes", data);
}

export function updateNote(id: number, data: UpdateNoteInput) {
  return request.put<Note>(`/notes/${id}`, data);
}

export function deleteNote(id: number) {
  return request.delete(`/notes/${id}`);
}

export function searchNotes(params: SearchNoteInput) {
  return request.get<Note[]>("/notes/search", { params });
}

export function getNotesByTag(tag: string) {
  return request.get<Note[]>(`/notes/tags/${tag}`);
}

export function getNoteByShareToken(token: string) {
  return request.get<Note>(`/notes/shared/${token}`);
}

export function shareNote(id: number) {
  return request.post<any, ShareNoteResponse>(`/notes/${id}/share`);
}

export function getSharedNote(token: string) {
  return request.get<any, Note>(`/notes/share/${token}`);
}

export function importNotes(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request.post<any, ImportResult>("/notes/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

export function exportNotes(options: ExportOptions) {
  return request.get("/notes/export", {
    params: options,
    responseType: "blob",
  });
}
