import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/config/env.js";

const queryClient = postgres(env.DATABASE_URL);
export const db = drizzle(queryClient);
