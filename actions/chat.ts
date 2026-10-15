"use server"

import { auth } from "@trigger.dev/sdk"
import {
  chat,
  defaultStorage,
  type ChatLoadTranscriptParams,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai"

import { getDesktopUrl } from "@/lib/daytona"
import { getChat, getChatSandboxId } from "@/queries/chats"
import type { chatAgent } from "@/trigger/chat"

// chatId comes from the browser, so every action checks the signed-in user
// owns the chat before touching its session or transcript.
async function assertChatOwner(chatId: string) {
  const owned = await getChat(chatId)
  if (!owned) throw new Error("Chat not found.")
}

const start = chat.createStartSessionAction<typeof chatAgent>("chat")

// Creates the session and its first run, returns a session-scoped token.
export async function startChatSession(
  params: ChatStartSessionParams<typeof chatAgent>
) {
  await assertChatOwner(params.chatId)
  return start(params)
}

// The transport calls this to refresh an expired token.
export async function mintChatAccessToken(chatId: string) {
  await assertChatOwner(chatId)
  return auth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  })
}

const load = chat.createLoadTranscriptAction(defaultStorage)

// The saved conversation, for rendering before the chat connects.
export async function loadTranscript(params: ChatLoadTranscriptParams) {
  await assertChatOwner(params.chatId)
  return load(params)
}

// The bot's desktop as a noVNC URL, for the desktop panel.
export async function getChatDesktopUrl(
  chatId: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const sandboxId = await getChatSandboxId(chatId)
  if (!sandboxId) return { success: false, error: "Chat not found." }

  try {
    return { success: true, url: await getDesktopUrl(sandboxId) }
  } catch (error) {
    console.error(`Failed to open the desktop of sandbox ${sandboxId}`, error)
    return { success: false, error: "Couldn't open the bot's desktop." }
  }
}
