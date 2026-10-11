// Drizzle table definitions. Run `npm run db:push` after changing this file.
// https://orm.drizzle.team/docs/sql-schema-declaration
import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
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

export const chatKind = pgEnum("chat_kind", ["direct", "group"])

export const chats = pgTable(
  "chats",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => nanoid()),
    // Clerk user ID
    userId: text("user_id").notNull(),
    kind: chatKind().notNull().default("direct"),
    // Null for direct chats, which use the bot's name
    name: text(),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("chats_user_id_idx").on(table.userId)]
)

export type Chat = typeof chats.$inferSelect
export type NewChat = typeof chats.$inferInsert

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    botId: text("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.chatId, table.botId] }),
    index("chat_members_bot_id_idx").on(table.botId),
  ]
)

export type ChatMember = typeof chatMembers.$inferSelect
export type NewChatMember = typeof chatMembers.$inferInsert

// https://orm.drizzle.team/docs/relations
export const botsRelations = relations(bots, ({ many }) => ({
  memberships: many(chatMembers),
}))

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
}))

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, { fields: [chatMembers.chatId], references: [chats.id] }),
  bot: one(bots, { fields: [chatMembers.botId], references: [bots.id] }),
}))
