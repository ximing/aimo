import { create } from "zustand";
import type { Note, CreateNoteInput, UpdateNoteInput, Attachment } from "@/api/types";
import { getNotes, createNote, updateNote, deleteNote } from "@/api/notes";
import { getTags, type TagInfo } from "@/api/tags";
import { Dayjs } from "dayjs";

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
  searchMode: "similarity" | "fulltext";
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  total: number;

  // Actions
  fetchNotes: (page?: number) => Promise<void>;
  addNote: (data: CreateNoteInput & { attachments?: Attachment[] }) => Promise<void>;
  updateNote: (id: number, data: UpdateNoteInput & { attachments?: Attachment[] }) => Promise<void>;
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
  setSearchMode: (mode: "similarity" | "fulltext") => void;
  setDateRange: (start: Dayjs | null, end: Dayjs | null) => void;
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
  searchMode: "similarity",
  startDate: null,
  endDate: null,
  total: 0,

  setCurrentPage: (page) => set({ currentPage: page }),

  fetchNotes: async (page?: number) => {
    const state = get();
    const targetPage = page || state.currentPage;
    
    set({ isLoading: true });
    try {
      const response = await getNotes({
        page: targetPage,
        pageSize: state.pageSize,
        sortBy: state.sortBy,
        search: state.searchText,
        searchMode: state.searchMode,
        startDate: state.startDate?.format("YYYY-MM-DD"),
        endDate: state.endDate?.format("YYYY-MM-DD"),
      });

      const { notes, pagination } = response;
      
      set((state) => ({
        notes: targetPage === 1 ? notes : [...state.notes, ...notes],
        currentPage: targetPage,
        total: pagination.total,
        hasMore: pagination.hasMore,
        error: null,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  addNote: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newNote = await createNote({
        content: data.content,
        tags: data.tags,
        isPublic: data.isPublic,
        attachments: data.attachments || [],
      });
      set((state) => ({
        notes: [newNote, ...state.notes],
        isLoading: false,
        newNoteContent: "",
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
    get().fetchTags();
  },

  updateNote: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedNote = await updateNote(id, {
        content: data.content,
        tags: data.tags,
        isPublic: data.isPublic,
        attachments: data.attachments,
      });
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
    get().fetchTags();
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

  setNewNoteContent: (content) => set({ newNoteContent: content }),

  refreshHeatmap: () => {
    // 这里可以触发热力图组件的刷新
    // 由于热力图组件自己管理状态，这里可以是一个空函数
  },

  setSearchMode: (mode) => {
    set({ searchMode: mode });
    get().fetchNotes(1);
  },

  setDateRange: (start, end) => {
    set({ 
      startDate: start,
      endDate: end,
      currentPage: 1,
    });
    get().fetchNotes(1);
  },
}));
