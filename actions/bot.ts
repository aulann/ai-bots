"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import {
  bots,
  insertBotSchema,
  type Bot,
  type InsertBot,
} from "@/lib/db/schema"

type CreateBotResult =
  { success: true; bot: Bot } | { success: false; error: string }

export async function createBot(input: InsertBot): Promise<CreateBotResult> {
  const { userId } = await auth.protect()

  const parsed = insertBotSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid bot.",
    }
  }

  const [bot] = await db
    .insert(bots)
    .values({
      ...parsed.data,
      instruction: parsed.data.instruction || null,
      userId,
    })
    .returning()

  revalidatePath("/")

  return { success: true, bot }
}
