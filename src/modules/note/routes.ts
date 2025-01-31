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
  getNotesHeatmap,
} from "./controller.js";
import {
  createNoteSchema,
  updateNoteSchema,
  searchNoteSchema,
  getNoteByShareTokenSchema,
  getNotesSchema,
  heatmapSchema,
  getNoteSchema,
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

  // 统一的笔记查询接口
  app.get("/", { schema: getNoteSchema }, getNotes as RouteHandlerMethod);

  // Public access
  app.get(
    "/shared/:token",
    { schema: getNoteByShareTokenSchema },
    getNoteByShareToken
  );

  // 获取所有标签及其数量
  app.get("/tags", getTags as RouteHandlerMethod);

  app.get(
    "/stats/heatmap",
    { schema: heatmapSchema },
    getNotesHeatmap as RouteHandlerMethod
  );
}
