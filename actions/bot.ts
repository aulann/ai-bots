"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"

import { createSandbox, deleteSandbox } from "@/lib/daytona"
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

  // Every bot gets its own sandbox, created before the rows that point to it.
  const botId = nanoid()
  let sandboxId: string
  try {
    sandboxId = await createSandbox({ botId, userId })
  } catch (error) {
    console.error("Failed to create sandbox", error)
    return { success: false, error: "Couldn't set up the bot's sandbox." }
  }

  // Every bot starts with a direct chat. Create all three rows or none.
  let created: { bot: Bot; chat: Chat }
  try {
    created = await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values({
          ...parsed.data,
          instruction: parsed.data.instruction || null,
          id: botId,
          userId,
          sandboxId,
        })
        .returning()

      const [chat] = await tx
        .insert(chats)
        .values({ userId, kind: "direct" })
        .returning()

      await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })

      return { bot, chat }
    })
  } catch (error) {
    // Don't leave a sandbox behind without a bot.
    await deleteSandbox(sandboxId).catch((cleanupError) =>
      console.error("Failed to delete orphaned sandbox", cleanupError)
    )
    throw error
  }
  const { bot, chat } = created

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

  // The bot is already gone, so a failed sandbox delete only gets logged.
  try {
    await deleteSandbox(bot.sandboxId)
  } catch (error) {
    console.error(`Failed to delete sandbox ${bot.sandboxId}`, error)
  }

  revalidatePath("/", "layout")

  return { success: true, bot }
}
