import { existsSync } from "node:fs";

import { parseEnv } from "@neon/env";
import { defineConfig } from "drizzle-kit";

import config from "./neon";

// drizzle-kit doesn't load Next.js env files on its own.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

// Schema push needs the direct (non-pooled) connection.
const { postgres } = parseEnv(config, ["DATABASE_URL_UNPOOLED"]);

export default defineConfig({
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: postgres.databaseUrlUnpooled },
});
