import OpenAI from "openai";
import { env } from "@/config/env.js";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_API_BASE_URL,
});

export async function generateEmbedding(text: string): Promise<string> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
  });

  return JSON.stringify(response.data[0].embedding);
}
