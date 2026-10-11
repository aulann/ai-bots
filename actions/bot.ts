"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
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
  { success: true; bot: Bot; chat: Chat } | { success: false; error: string }

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

type UpdateBotResult =
  { success: true; bot: Bot } | { success: false; error: string }

export async function updateBot(
  botId: string,
  input: InsertBot
): Promise<UpdateBotResult> {
  const { userId } = await auth.protect()

  const parsed = insertBotSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid bot.",
    }
  }

  // Scope by userId so a user can only edit their own bots.
  const [bot] = await db
    .update(bots)
    .set({
      ...parsed.data,
      instruction: parsed.data.instruction || null,
    })
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning()

  if (!bot) {
    return { success: false, error: "Bot not found." }
  }

  // The bot's name and face show in the sidebar and every chat header.
  revalidatePath("/", "layout")

  return { success: true, bot }
}

type DeleteBotResult =
  { success: true; bot: Bot } | { success: false; error: string }

export async function deleteBot(botId: string): Promise<DeleteBotResult> {
  const { userId } = await auth.protect()

  const bot = await db.transaction(async (tx) => {
    // The bot's direct chats would be left empty, so they go with it.
    const directChats = await tx
      .select({ id: chats.id })
      .from(chats)
      .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
      .where(
        and(
          eq(chatMembers.botId, botId),
          eq(chats.userId, userId),
          eq(chats.kind, "direct")
        )
      )

    // Scope by userId so a user can only delete their own bots.
    const [bot] = await tx
      .delete(bots)
      .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
      .returning()

    if (!bot) return undefined

    if (directChats.length > 0) {
      await tx.delete(chats).where(
        inArray(
          chats.id,
          directChats.map((chat) => chat.id)
        )
      )
    }

    return bot
  })

  if (!bot) {
    return { success: false, error: "Bot not found." }
  }

  revalidatePath("/", "layout")

  return { success: true, bot }
}
