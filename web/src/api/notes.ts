import request from '@/utils/request'
import type { Note, CreateNoteInput, UpdateNoteInput, ShareNoteResponse, ImportResult, ExportOptions } from './types'

export function getNotes(params?: { limit?: number; offset?: number }) {
  return request.get<any, Note[]>('/notes', { params })
}

export function createNote(data: CreateNoteInput) {
  return request.post<any, Note>('/notes', data)
}

export function updateNote(id: number, data: UpdateNoteInput) {
  return request.put<any, Note>(`/notes/${id}`, data)
}

export function deleteNote(id: number) {
  return request.delete<any, void>(`/notes/${id}`)
}

export function searchNotes(query: string, tag?: string) {
  return request.get<any, Note[]>('/notes/search', {
    params: { q: query, tag }
  })
}

export function shareNote(id: number) {
  return request.post<any, ShareNoteResponse>(`/notes/${id}/share`)
}

export function getSharedNote(token: string) {
  return request.get<any, Note>(`/notes/share/${token}`)
}

export function importNotes(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<any, ImportResult>('/notes/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function exportNotes(options: ExportOptions) {
  return request.get('/notes/export', {
    params: options,
    responseType: 'blob'
  })
}