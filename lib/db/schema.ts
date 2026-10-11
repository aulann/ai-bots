// Drizzle table definitions. Run `npm run db:push` after changing this file.
// https://orm.drizzle.team/docs/sql-schema-declaration
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const todos = pgTable(
  "todos",
  {
    id: uuid().primaryKey().defaultRandom(),
    // Clerk user ID
    userId: text("user_id").notNull(),
    title: text().notNull(),
    completed: boolean().notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("todos_user_id_idx").on(t.userId)]
)

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
