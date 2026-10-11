import { openrouter } from "@openrouter/ai-sdk-provider"
import { chat } from "@trigger.dev/sdk/ai"

// The conversation persists in the platform's default transcript storage,
// keyed by chat ID.
export const chatAgent = chat.agent({
  id: "chat",
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: openrouter("deepseek/deepseek-v4.1-flash"),
      messages,
      abortSignal: signal,
    }),
})
