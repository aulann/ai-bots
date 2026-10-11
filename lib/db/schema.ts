// Drizzle table definitions. Run `npm run db:push` after changing this file.
// https://orm.drizzle.team/docs/sql-schema-declaration
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { nanoid } from "nanoid"
import type { z } from "zod"

export const bots = pgTable(
  "bots",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => nanoid()),
    // Clerk user ID
    userId: text("user_id").notNull(),
    name: text().notNull(),
    // Seed for the bot's generated face
    avatar: text()
      .notNull()
      .$defaultFn(() => nanoid()),
    // What the bot is for, in a phrase
    job: text().notNull(),
    // How it should go about the job
    instruction: text(),
    // Sandbox ID, created lazily
    sandboxId: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)]
)

export type Bot = typeof bots.$inferSelect
export type NewBot = typeof bots.$inferInsert

// The fields a user fills in. userId comes from the session, the rest from the database.
// https://orm.drizzle.team/docs/zod
export const insertBotSchema = createInsertSchema(bots, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "Give your bot a name.")
      .max(50, "Keep the name under 50 characters."),
  avatar: (schema) => schema.min(1),
  job: (schema) =>
    schema
      .trim()
      .min(1, "Say what the bot is for.")
      .max(100, "Keep the job under 100 characters."),
  instruction: (schema) =>
    schema.trim().max(2000, "Keep instructions under 2000 characters."),
})
  .pick({ name: true, avatar: true, job: true, instruction: true })
  .required({ avatar: true })

export type InsertBot = z.infer<typeof insertBotSchema>
