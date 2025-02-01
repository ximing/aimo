import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
  vector,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    hashedPassword: varchar('hashed_password', { length: 255 }),
    name: varchar('name', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    role: text('role', { enum: ['admin', 'user'] })
      .default('user')
      .notNull(),
    githubId: text('github_id').unique(),
    googleId: text('google_id').unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    usersNameIdx: index('users_name_idx').on(table.name),
    usersEmailIdx: index('users_email_idx').on(table.email),
    usersGithubIdx: index('users_github_idx').on(table.githubId),
    usersGoogleIdx: index('users_google_idx').on(table.googleId),
  })
);

export const notes = pgTable(
  'notes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    content: text('content').notNull(),
    vectorEmbedding: vector('vector_embedding', { dimensions: 1536 }),
    isPublic: boolean('is_public').default(false).notNull(),
    shareToken: varchar('share_token', { length: 255 }),
    attachments: jsonb('attachments')
      .default(sql`'[]'::jsonb`)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    notesVectorIdx: sql`CREATE INDEX IF NOT EXISTS notes_vector_embedding_idx 
    ON ${table} 
    USING hnsw (vector_embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64)`,
    notesUserIdIdx: index('notes_user_id_idx').on(table.userId),
    notesCreatedAtIdx: index('notes_created_at_idx').on(table.createdAt),
    notesShareTokenIdx: index('notes_share_token_idx').on(table.shareToken),
  })
);

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
  },
  (table) => ({
    tagsNameIdx: index('tags_name_idx').on(table.name),
  })
);

export const noteTags = pgTable(
  'note_tags',
  {
    noteId: integer('note_id').notNull(),
    tagId: integer('tag_id').notNull(),
  },
  (table) => ({
    noteTagIdx: index('note_tag_idx').on(table.noteId, table.tagId),
  })
);

export const attachments = pgTable(
  'attachments',
  {
    id: serial('id').primaryKey(),
    filename: text('filename').notNull(),
    url: text('url').notNull(),
    size: integer('size').notNull(),
    mimeType: text('mime_type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({})
);

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const webhooks = pgTable(
  'webhooks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    url: text('url').notNull(),
    events: text('events').array().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    secret: text('secret').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    webhooksUserIdIdx: index('webhooks_user_id_idx').on(table.userId),
    webhooksActiveIdx: index('webhooks_active_idx').on(table.isActive),
  })
);

// Relations (用于查询，但不创建外键约束)
export const noteRelations = relations(notes, ({ one, many }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  noteTags: many(noteTags),
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(notes, {
    fields: [noteTags.noteId],
    references: [notes.id],
  }),
  tag: one(tags, {
    fields: [noteTags.tagId],
    references: [tags.id],
  }),
}));

export const tagRelations = relations(tags, ({ many }) => ({
  noteTags: many(noteTags),
}));
