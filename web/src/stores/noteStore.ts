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

  // Actions
  fetchNotes: () => Promise<void>;
  addNote: (data: CreateNoteInput) => Promise<void>;
  updateNote: (id: number, data: UpdateNoteInput) => Promise<void>;
  removeNote: (id: number) => Promise<void>;
  setSelectedDate: (date: Date | null) => void;
  setSortBy: (sort: "newest" | "oldest") => void;
  setSearchText: (text: string) => void;
  setSelectedTag: (tag: string | null) => void;
  deleteNote: (id: number) => Promise<void>;
  fetchTags: () => Promise<void>;

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

  fetchNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await getNotes();
      set({
        notes,
        isLoading: false,
        hasMore: notes.length >= 20, // 假设每页 20 条
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addNote: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newNote = (await createNote(data)) as Note;
      set((state) => ({
        notes: [...state.notes, newNote],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
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
  setSortBy: (sort) => set({ sortBy: sort }),
  setSearchText: (text) => set({ searchText: text }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),

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
      console.error('Failed to fetch tags:', error);
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
}));
