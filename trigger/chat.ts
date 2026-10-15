import { openrouter } from "@openrouter/ai-sdk-provider"
import { chat } from "@trigger.dev/sdk/ai"
import { isStepCount } from "ai"

import { botSystemPrompt } from "@/lib/bot-prompt"
import { db } from "@/lib/db/client"

import { botSandbox } from "./sandbox"
import { tools } from "./tools"

// The system prompt for the chat's bot, built once per run.
const systemPrompt = chat.local<{ value: string }>({ id: "systemPrompt" })

// The conversation persists in the platform's default transcript storage,
// keyed by chat ID.
export const chatAgent = chat.agent({
  id: "chat",
  // Declared here as well as on streamText, so screenshots still reach the
  // model as images when history is re-converted on later turns.
  tools,
  // onBoot fires on every run, including continuations, so the prompt is
  // always there and picks up edits to the bot from the next run on.
  onBoot: async ({ chatId }) => {
    const membership = await db.query.chatMembers.findFirst({
      where: (members, { eq }) => eq(members.chatId, chatId),
      orderBy: (members, { asc }) => [asc(members.joinedAt)],
      with: {
        bot: {
          columns: { name: true, job: true, instruction: true, sandboxId: true },
        },
      },
    })
    if (!membership) throw new Error(`No bot in chat ${chatId}.`)

    systemPrompt.init({ value: botSystemPrompt(membership.bot) })
    botSandbox.init({ id: membership.bot.sandboxId })
  },
  run: async ({ messages, tools, signal, streamText }) =>
    streamText({
      model: openrouter("deepseek/deepseek-v4.1-flash"),
      system: systemPrompt.value,
      messages,
      tools,
      // Computer use takes many small steps: look, click, type, look again.
      stopWhen: isStepCount(50),
      abortSignal: signal,
    }),
})
