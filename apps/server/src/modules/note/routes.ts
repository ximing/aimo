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
  schemas,
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
  }>('/', { schema: schemas.createNote }, createNote);

  app.put<{
    Params: { id: string };
    Body: UpdateNoteInput;
  }>('/:id', { schema: schemas.updateNote }, updateNote);

  app.delete<{
    Params: { id: string };
  }>('/:id', {}, deleteNote);

  app.get<{
    Querystring: NoteQueryParams;
  }>('/', { schema: schemas.getNotes }, getNotes);

  app.get<{
    Params: { token: string };
  }>(
    '/shared/:token',
    { schema: schemas.getNoteByShareToken },
    getNoteByShareToken
  );

  app.get('/tags', { schema: schemas.getTags }, getTags);

  app.get<{
    Querystring: HeatmapQuery;
  }>('/stats/heatmap', { schema: schemas.getHeatmap }, getNotesHeatmap);

  app.post(
    '/attachments',
    { schema: schemas.uploadAttachments },
    uploadAttachments
  );
}
