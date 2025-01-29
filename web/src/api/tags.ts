import request from '@/utils/request'
import type { TagStats } from './types'

export function getTags() {
  return request.get<any, TagStats[]>('/tags')
}

export function deleteTag(name: string) {
  return request.delete<any, void>(`/tags/${name}`)
}

export function mergeTag(oldName: string, newName: string) {
  return request.post<any, void>('/tags/merge', { oldName, newName })
}

export function getTagStats() {
  return request.get<any, TagStats[]>('/tags/stats')
}