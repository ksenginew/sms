import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./db/auth-schema";
import { db } from "./db";
import { BETTER_AUTH_URL } from "$env/static/private";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  baseURL: BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
});
