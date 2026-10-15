"use client"

import { useChat } from "@ai-sdk/react"
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat"
import type { InferChatUIMessageFromTools } from "@trigger.dev/sdk/ai"
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
import {
  EyeIcon,
  KeyboardIcon,
  type LucideIcon,
  MousePointer2Icon,
  MousePointerClickIcon,
  MoveIcon,
  ScrollIcon,
  TypeIcon,
} from "lucide-react"
import { type BundledLanguage, bundledLanguages } from "shiki"

import {
  loadTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"
import { CodeBlock } from "@/components/ai-elements/code-block"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/ai-elements/file-tree"
import { Image } from "@/components/ai-elements/image"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { Shimmer } from "@/components/ai-elements/shimmer"
import {
  Terminal,
  TerminalActions,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle,
} from "@/components/ai-elements/terminal"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool"
import { Badge } from "@/components/ui/badge"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { chatAgent } from "@/trigger/chat"
import type { tools } from "@/trigger/tools"

type ChatMessage = InferChatUIMessageFromTools<typeof tools>
type ChatPart = ChatMessage["parts"][number]
type ToolPart<Name extends string> = Extract<ChatPart, { type: `tool-${Name}` }>

export function Chat({ id }: { id: string }) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
  })
  const { messages, isLoading } = useLoadTranscript(id, loadTranscript, {
    transport,
  })

  // useChat takes its initial messages once, so mount it after the load.
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <ChatView
      id={id}
      initialMessages={messages as ChatMessage[]}
      transport={transport}
    />
  )
}

function ChatView({
  id,
  initialMessages,
  transport,
}: {
  id: string
  initialMessages: ChatMessage[]
  transport: TriggerChatTransport
}) {
  const { messages, sendMessage, status, stop } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    transport,
  })

  function handleSubmit(message: PromptInputMessage) {
    if (!message.text.trim()) return
    sendMessage({ text: message.text })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.map((message) => (
            <Message
              from={message.role}
              key={message.id}
              // Full width, so screenshots can center in the chat.
              className={message.role === "assistant" ? "max-w-full" : undefined}
            >
              <MessageContent className="group-[.is-assistant]:w-full">
                {message.parts.map((part, i) => (
                  <MessagePart key={`${message.id}-${i}`} part={part} />
                ))}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="px-4 pb-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Message..." />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}

function MessagePart({ part }: { part: ChatPart }) {
  switch (part.type) {
    case "text":
      return (
        // The user's bubble comes from MessageContent. The bot's goes on its
        // text only, so screenshots and tool cards stay full width.
        <div className="group-[.is-assistant]:w-fit group-[.is-assistant]:max-w-full group-[.is-assistant]:rounded-lg group-[.is-assistant]:bg-blue-500/15 group-[.is-assistant]:px-4 group-[.is-assistant]:py-3">
          <MessageResponse>{part.text}</MessageResponse>
        </div>
      )
    case "tool-bash":
      return <BashTool part={part} />
    case "tool-readFile":
      return <ReadFileTool part={part} />
    case "tool-writeFile":
      return <WriteFileTool part={part} />
    case "tool-listFiles":
      return <ListFilesTool part={part} />
    case "tool-showScreen":
      return <ShowScreenTool part={part} />
    case "tool-mouseClick":
      return (
        <ActionMarker
          part={part}
          icon={MousePointerClickIcon}
          label={`${part.input?.double ? "Double-clicked" : "Clicked"}${at(part.input)}`}
        />
      )
    case "tool-mouseMove":
      return (
        <ActionMarker
          part={part}
          icon={MousePointer2Icon}
          label={`Moved the mouse${at(part.input)}`}
        />
      )
    case "tool-mouseDrag":
      return (
        <ActionMarker
          part={part}
          icon={MoveIcon}
          label={`Dragged${at({ x: part.input?.endX, y: part.input?.endY }, "to")}`}
        />
      )
    case "tool-mouseScroll":
      return (
        <ActionMarker
          part={part}
          icon={ScrollIcon}
          label={`Scrolled ${part.input?.direction ?? ""}${at(part.input)}`}
        />
      )
    case "tool-keyboardType":
      return (
        <ActionMarker
          part={part}
          icon={TypeIcon}
          label={`Typed “${part.input?.text ?? ""}”`}
        />
      )
    case "tool-keyboardPress":
      return (
        <ActionMarker
          part={part}
          icon={KeyboardIcon}
          label={`Pressed ${[...(part.input?.modifiers ?? []), part.input?.key ?? ""].join("+")}`}
        />
      )
    // The screenshot is for the bot only, so just note that it looked.
    case "tool-viewScreen":
      return (
        <ActionMarker part={part} icon={EyeIcon} label="Looked at the screen" />
      )
    default:
      return null
  }
}

function isRunning(state: string) {
  return state === "input-streaming" || state === "input-available"
}

function at(
  input: { x?: number; y?: number } | undefined,
  preposition = "at"
) {
  return input?.x === undefined || input.y === undefined
    ? ""
    : ` ${preposition} (${input.x}, ${input.y})`
}

// A one-line note for small actions on the desktop.
function ActionMarker({
  part,
  icon: Icon,
  label,
}: {
  part: { state: string; errorText?: string }
  icon: LucideIcon
  label: string
}) {
  return (
    <Marker>
      <MarkerIcon>
        <Icon />
      </MarkerIcon>
      <MarkerContent>
        {isRunning(part.state) ? (
          <Shimmer as="span">{label}</Shimmer>
        ) : (
          label
        )}
        {part.state === "output-error" && ` failed: ${part.errorText}`}
      </MarkerContent>
    </Marker>
  )
}

function BashTool({ part }: { part: ToolPart<"bash"> }) {
  const command = part.input?.command ?? ""
  const output =
    part.state === "output-available"
      ? part.output.output
      : part.state === "output-error"
        ? part.errorText
        : ""
  const exitCode =
    part.state === "output-available" ? part.output.exitCode : undefined

  return (
    <Terminal
      className="mb-4"
      isStreaming={isRunning(part.state)}
      output={output}
    >
      <TerminalHeader>
        <TerminalTitle className="min-w-0">
          <span className="truncate font-mono">{command}</span>
        </TerminalTitle>
        <div className="flex items-center gap-1">
          <TerminalStatus>
            <Spinner />
          </TerminalStatus>
          {exitCode !== undefined && exitCode !== 0 && (
            <Badge variant="destructive">Exit {exitCode}</Badge>
          )}
          <TerminalActions>
            <TerminalCopyButton />
          </TerminalActions>
        </div>
      </TerminalHeader>
      {output && <TerminalContent />}
    </Terminal>
  )
}

function languageOf(path: string): BundledLanguage {
  const extension = path.split(".").pop()?.toLowerCase() ?? ""
  return extension in bundledLanguages
    ? (extension as BundledLanguage)
    : "log"
}

function ReadFileTool({ part }: { part: ToolPart<"readFile"> }) {
  const path = part.input?.path ?? ""

  return (
    <Tool>
      <ToolHeader state={part.state} title={`Read ${path}`} type={part.type} />
      <ToolContent>
        {part.state === "output-available" && (
          <CodeBlock code={part.output.content} language={languageOf(path)} />
        )}
        <ToolOutput errorText={part.errorText} output={undefined} />
      </ToolContent>
    </Tool>
  )
}

function WriteFileTool({ part }: { part: ToolPart<"writeFile"> }) {
  const path = part.input?.path ?? ""

  return (
    <Tool>
      <ToolHeader state={part.state} title={`Wrote ${path}`} type={part.type} />
      <ToolContent>
        {part.input?.content !== undefined && (
          <CodeBlock code={part.input.content} language={languageOf(path)} />
        )}
        <ToolOutput errorText={part.errorText} output={undefined} />
      </ToolContent>
    </Tool>
  )
}

function ListFilesTool({ part }: { part: ToolPart<"listFiles"> }) {
  const path = part.input?.path ?? ""

  return (
    <Tool>
      <ToolHeader state={part.state} title={`Listed ${path}`} type={part.type} />
      <ToolContent>
        {part.state === "output-available" && (
          <FileTree>
            {part.output.entries.map((entry) =>
              entry.isDir ? (
                <FileTreeFolder
                  key={entry.name}
                  name={entry.name}
                  path={entry.name}
                />
              ) : (
                <FileTreeFile
                  key={entry.name}
                  name={entry.name}
                  path={entry.name}
                />
              )
            )}
          </FileTree>
        )}
        <ToolOutput errorText={part.errorText} output={undefined} />
      </ToolContent>
    </Tool>
  )
}

// The screenshot the user asked to see.
function ShowScreenTool({ part }: { part: ToolPart<"showScreen"> }) {
  if (part.state === "output-available") {
    return (
      <Image
        alt="The bot's screen"
        base64={part.output.data}
        className="mx-auto mb-4 w-full max-w-xl border"
        mediaType={part.output.mediaType}
        uint8Array={new Uint8Array()}
      />
    )
  }
  if (part.state === "output-error") {
    return (
      <ActionMarker
        part={part}
        icon={EyeIcon}
        label="Couldn't capture the screen"
      />
    )
  }
  return <Skeleton className="mb-4 aspect-video w-full" />
}
