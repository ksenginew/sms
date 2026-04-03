import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from './src/lib/server/db/schema';
import { testUtils } from "better-auth/plugins"
import process from 'process';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: process.env.DATABASE_URL });

const db = drizzle(client, { schema });
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    }
  },
  plugins: [
    testUtils()
  ]
});
