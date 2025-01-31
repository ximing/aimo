import { create } from "zustand";
import type { Note, CreateNoteInput, UpdateNoteInput } from "@/api/types";
import { getNotes, createNote, updateNote, deleteNote } from "@/api/notes";
import { getTags, type TagInfo } from "@/api/tags";

interface NoteState {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  selectedDate: Date | null;
  sortBy: "newest" | "oldest";
  searchText: string;
  selectedTag: string | null;
  hasMore: boolean;
  tags: TagInfo[];
  newNoteContent: string;
  currentPage: number;
  pageSize: number;

  // Actions
  fetchNotes: (page?: number) => Promise<void>;
  addNote: (data: CreateNoteInput) => Promise<void>;
  updateNote: (id: number, data: UpdateNoteInput) => Promise<void>;
  removeNote: (id: number) => Promise<void>;
  setSelectedDate: (date: Date | null) => void;
  setSortBy: (sort: "newest" | "oldest") => void;
  setSearchText: (text: string) => void;
  setSelectedTag: (tag: string | null) => void;
  deleteNote: (id: number) => Promise<void>;
  fetchTags: () => Promise<void>;
  setNewNoteContent: (content: string) => void;
  setCurrentPage: (page: number) => void;
  refreshHeatmap: () => void;

  // Computed
  filteredNotes: () => Note[];
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,
  selectedDate: null,
  sortBy: "newest",
  searchText: "",
  selectedTag: null,
  hasMore: true,
  tags: [],
  newNoteContent: "",
  currentPage: 1,
  pageSize: 20,

  setCurrentPage: (page) => set({ currentPage: page }),

  fetchNotes: async (page = 1) => {
    try {
      set({ isLoading: page === 1 });

      const response = await getNotes({
        page,
        pageSize: get().pageSize,
        sortBy: get().sortBy,
        tag: get().selectedTag || undefined,
        search: get().searchText || undefined,
      });

      set((state) => ({
        notes: page === 1 ? response.notes : [...state.notes, ...response.notes],
        hasMore: response.pagination.hasMore,
        currentPage: response.pagination.page,
        error: null,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: "获取笔记失败",
        isLoading: false,
      });
    }
  },

  addNote: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newNote = await createNote(data);
      set((state) => ({
        notes: [newNote, ...state.notes], // 将新笔记放在最前面
        isLoading: false,
        newNoteContent: "", // 清空输入框
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error; // 抛出错误以便组件处理
    }
  },

  updateNote: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedNote = (await updateNote(id, data)) as Note;
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  removeNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteNote(id);
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  setSortBy: (sort) => {
    set({
      sortBy: sort,
      currentPage: 1, // 重置页码
      notes: [], // 清空现有数据
    });
  },
  setSearchText: (text) => {
    set({
      searchText: text,
      currentPage: 1, // 重置页码
      notes: [], // 清空现有数据
    });
  },
  setSelectedTag: (tag) => {
    set((state) => ({
      selectedTag: tag,
      currentPage: 1, // 重置页码
      notes: [], // 清空现有数据
      hasMore: true, // 重置加载更多状态
    }));
    
    // 立即获取新标签的数据
    get().fetchNotes(1);
  },

  deleteNote: async (id) => {
    try {
      await deleteNote(id);
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
      }));
    } catch (error) {
      throw error;
    }
  },

  fetchTags: async () => {
    try {
      const tags = await getTags();
      set({ tags });
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  },

  filteredNotes: () => {
    const state = get();
    let filtered = [...state.notes];

    // 按日期筛选
    if (state.selectedDate) {
      const selectedDateStr = new Date(state.selectedDate)
        .toISOString()
        .split("T")[0];
      filtered = filtered.filter(
        (note) =>
          new Date(note.createdAt).toISOString().split("T")[0] ===
          selectedDateStr
      );
    }

    // 按标签筛选
    if (state.selectedTag) {
      filtered = filtered.filter((note) =>
        note.tags.includes(state.selectedTag!)
      );
    }

    // 按搜索文本筛选
    if (state.searchText) {
      const searchLower = state.searchText.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.content.toLowerCase().includes(searchLower) ||
          note.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // 排序
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return state.sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  },

  setNewNoteContent: (content) => set({ newNoteContent: content }),

  refreshHeatmap: () => {
    // 这里可以触发热力图组件的刷新
    // 由于热力图组件自己管理状态，这里可以是一个空函数
  },
}));
