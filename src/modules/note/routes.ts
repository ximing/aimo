import { FastifyInstance } from "fastify";
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
  // Add authentication check middleware
  app.addHook("preHandler", async (request, reply) => {
    if (request.routerPath === "/api/notes/share/:token") {
      return;
    }
    await app.authenticate(request, reply);
  });

  // CRUD operations
  app.post("/", { schema: createNoteSchema }, createNote);
  app.put("/:id", { schema: updateNoteSchema }, updateNote);
  app.delete("/:id", deleteNote);
  app.get("/", getNotes);

  // Search and filter
  app.get("/search", { schema: searchNoteSchema }, searchNotes);
  app.get("/tags/:tag", getNotesByTag);

  // Public access
  app.get(
    "/share/:token",
    { schema: getNoteByShareTokenSchema },
    getNoteByShareToken,
  );
}
