import { FastifyInstance, RouteHandlerMethod } from "fastify";
import {
  createNote,
  updateNote,
  deleteNote,
  getNotes,
  searchNotes,
  getNoteByShareToken,
  getNotesByTag,
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
  app.put("/:id", { schema: updateNoteSchema }, updateNote as RouteHandlerMethod);
  app.delete("/:id", deleteNote as RouteHandlerMethod);
  app.get("/", getNotes as RouteHandlerMethod);

  // Search and filter
  app.get("/search", { schema: searchNoteSchema }, searchNotes);
  app.get("/tags/:tag", getNotesByTag);

  // Public access
  app.get(
    "/shared/:token",
    { schema: getNoteByShareTokenSchema },
    getNoteByShareToken,
  );
}
