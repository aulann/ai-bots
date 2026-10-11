import { auth } from "@clerk/nextjs/server"
import { openrouter } from "@openrouter/ai-sdk-provider"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

export async function POST(req: Request) {
  await auth.protect()

  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: openrouter("deepseek/deepseek-v4.1-flash"),
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
