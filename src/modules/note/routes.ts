import { FastifyInstance, RouteHandlerMethod } from "fastify";
import {
  createNote,
  updateNote,
  deleteNote,
  getNotes,
  searchNotes,
  getNoteByShareToken,
  getNotesByTag,
  getTags,
} from "./controller.js";
import {
  createNoteSchema,
  updateNoteSchema,
  searchNoteSchema,
  getNoteByShareTokenSchema,
} from "./schema.js";

export async function noteRoutes(app: FastifyInstance) {
  // Protect all routes except getNoteByShareToken
  app.addHook("onRequest", async (request, reply) => {
    if (request.routerPath === "/api/notes/shared/:token") {
      return;
    }
    await app.authenticate(request, reply);
  });

  // CRUD operations
  app.post("/", { schema: createNoteSchema }, createNote as RouteHandlerMethod);
  app.put(
    "/:id",
    { schema: updateNoteSchema },
    updateNote as RouteHandlerMethod
  );
  app.delete("/:id", deleteNote as RouteHandlerMethod);
  app.get(
    "/",
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1 },
            pageSize: { type: 'number', minimum: 1, maximum: 100 },
            sortBy: { type: 'string', enum: ['newest', 'oldest'] }
          }
        }
      }
    },
    getNotes as RouteHandlerMethod
  );

  // Search and filter
  app.get("/search", { schema: searchNoteSchema }, searchNotes);
  app.get("/tags/:tag", getNotesByTag);

  // Public access
  app.get(
    "/shared/:token",
    { schema: getNoteByShareTokenSchema },
    getNoteByShareToken
  );

  // 获取所有标签及其数量
  app.get("/tags", getTags as RouteHandlerMethod);
}
