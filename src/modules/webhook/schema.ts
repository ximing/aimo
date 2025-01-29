import { z } from "zod";

export const createWebhookSchema = {
  body: z.object({
    url: z.string().url(),
    events: z.array(z.enum(["note.created", "note.updated", "note.deleted"])),
  }),
};

export type CreateWebhookInput = z.infer<typeof createWebhookSchema.body>;
