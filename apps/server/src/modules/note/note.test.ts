import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestApp, cleanupDatabase, createTestUser } from '@/test/setup.js';
import type { FastifyInstance } from 'fastify';
import { db } from '@/lib/db.js';
import { notes } from '@/config/schema.js';

describe('Note API', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: number;

  beforeEach(async () => {
    app = await setupTestApp();
    await cleanupDatabase();
    const { user, token } = await createTestUser();
    authToken = token;
    userId = user.id;
  });

  describe('Create Note', () => {
    it('should create a note without tags', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          content: 'Test note content',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('content', 'Test note content');
      expect(body).toHaveProperty('userId', userId);
      expect(body).toHaveProperty('tags', []);
    });

    it('should create a note with tags', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          content: 'Test note with tags',
          tags: ['test', 'example'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('content', 'Test note with tags');
      expect(body.tags).toEqual(['test', 'example']);
    });
  });

  describe('Update Note', () => {
    let noteId: number;

    beforeEach(async () => {
      const [note] = await db
        .insert(notes)
        .values({
          userId,
          content: 'Original content',
          isPublic: false,
        })
        .returning();
      noteId = note.id;
    });

    it('should update note content', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/notes/${noteId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          content: 'Updated content',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('content', 'Updated content');
    });

    it("should prevent updating other user's note", async () => {
      const { token: otherToken } = await createTestUser('other@example.com');

      const response = await app.inject({
        method: 'PUT',
        url: `/api/notes/${noteId}`,
        headers: {
          authorization: `Bearer ${otherToken}`,
        },
        payload: {
          content: 'Unauthorized update',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Delete Note', () => {
    let noteId: number;

    beforeEach(async () => {
      const [note] = await db
        .insert(notes)
        .values({
          userId,
          content: 'Note to delete',
          isPublic: false,
        })
        .returning();
      noteId = note.id;
    });

    it('should delete own note', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/notes/${noteId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify note is deleted
      const deletedNote = await db.query.notes.findFirst({
        where: (notes, { eq }) => eq(notes.id, noteId),
      });
      expect(deletedNote).toBeNull();
    });
  });

  describe('Search Notes', () => {
    beforeEach(async () => {
      await db.insert(notes).values([
        {
          userId,
          content: 'First test note about cats',
          isPublic: false,
        },
        {
          userId,
          content: 'Second test note about dogs',
          isPublic: false,
        },
      ]);
    });

    it('should search notes by content', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/notes/search?q=cats',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body[0]).toHaveProperty('content', 'First test note about cats');
    });
  });

  describe('Share Note', () => {
    let noteId: number;

    beforeEach(async () => {
      const [note] = await db
        .insert(notes)
        .values({
          userId,
          content: 'Public note',
          isPublic: true,
          shareToken: 'test-token',
        })
        .returning();
      noteId = note.id;
    });

    it('should access shared note without auth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/notes/share/test-token',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('content', 'Public note');
    });

    it('should not access non-public note', async () => {
      await db
        .update(notes)
        .set({ isPublic: false })
        .where((notes, { eq }) => eq(notes.id, noteId));

      const response = await app.inject({
        method: 'GET',
        url: '/api/notes/share/test-token',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
