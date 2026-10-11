"use server"

import { auth } from "@trigger.dev/sdk"
import {
  chat,
  defaultStorage,
  type ChatLoadTranscriptParams,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai"

import { getChat } from "@/queries/chats"
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
