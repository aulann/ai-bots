// The database client without the server-only guard, for code that runs
// outside Next.js (Trigger.dev tasks). App code imports `@/lib/db` instead.
import { parseEnv } from "@neon/env"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import config from "@/neon"
import * as schema from "./schema"

const { postgres } = parseEnv(config, ["DATABASE_URL"])

// Reuse the pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pool?: Pool }

const pool =
  globalForDb.pool ?? new Pool({ connectionString: postgres.databaseUrl })

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

export const db = drizzle({ client: pool, schema })
