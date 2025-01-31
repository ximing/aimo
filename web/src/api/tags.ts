import request from "@/utils/request";
import type { TagStats } from "./types";

export interface TagInfo {
  name: string;
  count: number;
}

export async function getTags(): Promise<TagInfo[]> {
  return (await request.get<TagInfo[]>("/notes/tags")).data;
}

export async function deleteTag(name: string) {
  return (await request.delete<void>(`/tags/${name}`)).data;
}

export async function mergeTag(oldName: string, newName: string) {
  return (await request.post<void>("/tags/merge", { oldName, newName })).data;
}

export async function getTagStats() {
  return (await request.get<TagStats[]>("/tags/stats")).data;
}
