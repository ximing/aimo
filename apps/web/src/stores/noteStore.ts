import { create } from 'zustand';
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  Attachment,
} from '@/api/types';
import { getNotes, createNote, updateNote, deleteNote } from '@/api/notes';
import { getTags, type TagInfo } from '@/api/tags';
import type { Dayjs } from 'dayjs';

interface NoteState {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  selectedDate: Date | null;
  sortBy: 'newest' | 'oldest';
  searchText: string;
  selectedTag: string | null;
  hasMore: boolean;
  tags: TagInfo[];
  newNoteContent: string;
  currentPage: number;
  pageSize: number;
  searchMode: 'similarity' | 'fulltext';
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  total: number;

  // 新建笔记
  newNoteTags: string[];
  newNoteAttachments: Attachment[];
  isPublishing: boolean;

  // 编辑笔记
  editingNoteId: number | null;
  editingContent: string;
  editingTags: string[];
  editingAttachments: Attachment[];

  // Actions
  fetchNotes: (page?: number) => Promise<void>;
  addNote: () => Promise<void>;
  updateNote: (noteId: number) => Promise<void>;
  removeNote: (id: number) => Promise<void>;
  setSelectedDate: (date: Date | null) => void;
  setSortBy: (sort: 'newest' | 'oldest') => void;
  setSearchText: (text: string) => void;
  setSelectedTag: (tag: string | null) => void;
  deleteNote: (id: number) => Promise<void>;
  fetchTags: () => Promise<void>;
  setNewNoteContent: (content: string) => void;
  setNewNoteTags: (tags: string[]) => void;
  setNewNoteAttachments: (attachments: Attachment[]) => void;
  setEditingContent: (content: string) => void;
  setEditingTags: (tags: string[]) => void;
  setEditingAttachments: (attachments: Attachment[]) => void;
  setCurrentPage: (page: number) => void;
  refreshHeatmap: () => void;
  setSearchMode: (mode: 'similarity' | 'fulltext') => void;
  setDateRange: (start: Dayjs | null, end: Dayjs | null) => void;
  startEditNote: (note: Note) => void;
  cancelEditNote: () => void;
  setIsPublishing: (isPublishing: boolean) => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,
  selectedDate: null,
  sortBy: 'newest',
  searchText: '',
  selectedTag: null,
  hasMore: true,
  tags: [],
  newNoteContent: '',
  currentPage: 1,
  pageSize: 20,
  searchMode: 'fulltext',
  startDate: null,
  endDate: null,
  total: 0,

  // 新建笔记
  newNoteTags: [],
  newNoteAttachments: [],
  isPublishing: false,

  // 编辑笔记
  editingNoteId: null,
  editingContent: '',
  editingTags: [],
  editingAttachments: [],

  setCurrentPage: (page) => set({ currentPage: page }),

  fetchNotes: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getNotes({
        page,
        pageSize: get().pageSize,
        sortBy: get().sortBy,
        search: get().searchText,
        searchMode: get().searchMode,
        startDate: get().startDate?.format('YYYY-MM-DD'),
        endDate: get().endDate?.format('YYYY-MM-DD'),
        tag: get().selectedTag,
      });

      set((state) => ({
        notes:
          page === 1 ? response.notes : [...state.notes, ...response.notes],
        hasMore: response.pagination.hasMore,
        total: response.pagination.total,
        currentPage: page,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addNote: async () => {
    const { newNoteContent, newNoteTags, newNoteAttachments } = get();
    if (!newNoteContent.trim()) return;

    set({ isPublishing: true });
    try {
      await createNote({
        content: newNoteContent,
        tags: newNoteTags,
        isPublic: false,
        attachments: newNoteAttachments,
      });

      set({
        newNoteContent: '',
        newNoteTags: [],
        newNoteAttachments: [],
        isPublishing: false,
      });

      await get().fetchNotes(1);
    } catch (error) {
      set({ error: (error as Error).message, isPublishing: false });
    }
  },

  updateNote: async (noteId) => {
    const { editingContent, editingTags, editingAttachments } = get();
    set({ isPublishing: true });

    try {
      await updateNote(noteId, {
        content: editingContent,
        tags: editingTags,
        attachments: editingAttachments,
      });

      set({
        editingNoteId: null,
        editingContent: '',
        editingTags: [],
        editingAttachments: [],
        isPublishing: false,
      });

      await get().fetchNotes();
    } catch (error) {
      set({ error: (error as Error).message, isPublishing: false });
      throw error;
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
      console.error('Failed to fetch tags:', error);
    }
  },

  setNewNoteContent: (content) => set({ newNoteContent: content }),
  setNewNoteTags: (tags) => set({ newNoteTags: tags }),
  setNewNoteAttachments: (attachments) =>
    set({ newNoteAttachments: attachments }),
  setEditingContent: (content) => set({ editingContent: content }),
  setEditingTags: (tags) => set({ editingTags: tags }),
  setEditingAttachments: (attachments) =>
    set({ editingAttachments: attachments }),

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

  startEditNote: (note: Note) => {
    set({
      editingNoteId: note.id,
      editingContent: note.content,
      editingTags: note.tags,
      editingAttachments: note.attachments,
    });
  },

  cancelEditNote: () => {
    set({
      editingNoteId: null,
      editingContent: '',
      editingTags: [],
      editingAttachments: [],
    });
  },

  setIsPublishing: (isPublishing) => set({ isPublishing }),
}));
