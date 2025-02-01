import { Static, Type } from '@sinclair/typebox';

// 基础类型定义
export const Note = Type.Object({
  id: Type.Number(),
  content: Type.String(),
  createdAt: Type.Number(),
  updatedAt: Type.Number(),
  userId: Type.Number(),
  isPublic: Type.Boolean(),
  shareToken: Type.Optional(Type.String()),
  attachments: Type.Array(
    Type.Object({
      url: Type.String(),
      filename: Type.String(),
      size: Type.Number(),
      mimeType: Type.String(),
    })
  ),
  vectorEmbedding: Type.Optional(Type.Any()),
  tags: Type.Array(Type.String()),
});

export const CreateNoteSchema = Type.Object({
  content: Type.String(),
  tags: Type.Optional(Type.Array(Type.String())),
  isPublic: Type.Optional(Type.Boolean()),
  attachments: Type.Optional(
    Type.Array(
      Type.Object({
        url: Type.String(),
        filename: Type.String(),
        size: Type.Number(),
        mimeType: Type.String(),
      })
    )
  ),
});

export const UpdateNoteSchema = Type.Object({
  content: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  isPublic: Type.Optional(Type.Boolean()),
  attachments: Type.Optional(
    Type.Array(
      Type.Object({
        url: Type.String(),
        filename: Type.String(),
        size: Type.Number(),
        mimeType: Type.String(),
      })
    )
  ),
});

export const NoteQuerySchema = Type.Object({
  page: Type.Optional(Type.Number()),
  pageSize: Type.Optional(Type.Number()),
  sortBy: Type.Optional(
    Type.Union([Type.Literal('newest'), Type.Literal('oldest')])
  ),
  tag: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  searchMode: Type.Optional(
    Type.Union([Type.Literal('fulltext'), Type.Literal('similarity')])
  ),
  startDate: Type.Optional(Type.String({ format: 'date' })),
  endDate: Type.Optional(Type.String({ format: 'date' })),
});

export const HeatmapQuerySchema = Type.Object({
  startDate: Type.String({ format: 'date' }),
  endDate: Type.String({ format: 'date' }),
});

export const NoteResponseSchema = Type.Object({
  notes: Type.Array(Note),
  pagination: Type.Object({
    total: Type.Number(),
    page: Type.Number(),
    pageSize: Type.Number(),
    hasMore: Type.Boolean(),
  }),
});

// 导出类型
export type NoteType = Static<typeof Note>;
export type CreateNoteInput = Static<typeof CreateNoteSchema>;
export type UpdateNoteInput = Static<typeof UpdateNoteSchema>;
export type NoteQueryParams = Static<typeof NoteQuerySchema>;
export type HeatmapQuery = Static<typeof HeatmapQuerySchema>;
export type NoteResponse = Static<typeof Note>;

// 路由 schema 定义
export const schemas = {
  createNote: {
    body: CreateNoteSchema,
    response: {
      200: Note,
    },
  },
  updateNote: {
    body: UpdateNoteSchema,
    response: {
      200: Note,
    },
  },
  getNotes: {
    querystring: NoteQuerySchema,
    response: {
      200: NoteResponseSchema,
    },
  },
  getNoteByShareToken: {
    params: Type.Object({
      token: Type.String(),
    }),
    response: {
      200: Note,
    },
  },
  getTags: {
    response: {
      200: Type.Array(
        Type.Object({
          name: Type.String(),
          count: Type.Number(),
        })
      ),
    },
  },
  getHeatmap: {
    querystring: HeatmapQuerySchema,
    response: {
      200: Type.Array(
        Type.Object({
          date: Type.String(),
          count: Type.Number(),
        })
      ),
    },
  },
  uploadAttachments: {
    response: {
      200: Type.Array(
        Type.Object({
          url: Type.String(),
          filename: Type.String(),
          size: Type.Number(),
          mimeType: Type.String(),
        })
      ),
    },
  },
};
