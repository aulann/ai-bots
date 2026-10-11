"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import {
  bots,
  chatMembers,
  chats,
  insertBotSchema,
  type Bot,
  type Chat,
  type InsertBot,
} from "@/lib/db/schema"

type CreateBotResult =
  | { success: true; bot: Bot; chat: Chat }
  | { success: false; error: string }

export async function createBot(input: InsertBot): Promise<CreateBotResult> {
  const { userId } = await auth.protect()

  const parsed = insertBotSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid bot.",
    }
  }

  // Every bot starts with a direct chat. Create all three rows or none.
  const { bot, chat } = await db.transaction(async (tx) => {
    const [bot] = await tx
      .insert(bots)
      .values({
        ...parsed.data,
        instruction: parsed.data.instruction || null,
        userId,
      })
      .returning()

    const [chat] = await tx
      .insert(chats)
      .values({ userId, kind: "direct" })
      .returning()

    await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })

    return { bot, chat }
  })

  revalidatePath("/")

  return { success: true, bot, chat }
}
