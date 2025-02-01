import { FastifyInstance } from 'fastify';
import {
  createNote,
  updateNote,
  deleteNote,
  getNotes,
  getNoteByShareToken,
  getTags,
  getNotesHeatmap,
  uploadAttachments,
} from './controller.js';
import {
  createNoteSchema,
  updateNoteSchema,
  getNoteByShareTokenSchema,
  heatmapSchema,
  getNoteSchema,
  CreateNoteInput,
  UpdateNoteInput,
  NoteQueryParams,
  HeatmapQuery,
} from './schema.js';

export async function noteRoutes(app: FastifyInstance) {
  // Protect all routes except getNoteByShareToken
  app.addHook('onRequest', async (request, reply) => {
    if (request.routerPath === '/api/notes/shared/:token') {
      return;
    }
    await app.authenticate(request, reply);
  });

  app.post<{
    Body: CreateNoteInput;
  }>(
    '/',
    { schema: createNoteSchema },
    createNote
  );

  app.put<{
    Params: { id: string };
    Body: UpdateNoteInput;
  }>(
    '/:id',
    { schema: updateNoteSchema },
    updateNote
  );

  app.delete<{
    Params: { id: string };
  }>(
    '/:id',
    {},
    deleteNote
  );

  app.get<{
    Querystring: NoteQueryParams;
  }>(
    '/',
    { schema: getNoteSchema },
    getNotes
  );

  app.get<{
    Params: { token: string };
  }>(
    '/shared/:token',
    { schema: getNoteByShareTokenSchema },
    getNoteByShareToken
  );

  app.get(
    '/tags',
    {},
    getTags
  );

  app.get<{
    Querystring: HeatmapQuery;
  }>(
    '/stats/heatmap',
    { schema: heatmapSchema },
    getNotesHeatmap
  );

  app.post(
    '/attachments',
    {},
    uploadAttachments
  );
}
