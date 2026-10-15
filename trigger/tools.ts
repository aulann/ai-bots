import { tool, type ToolSet } from "ai"
import { z } from "zod"

import { getDesktop, getSandbox } from "./sandbox"

// Keeps long command output and files from flooding the context window.
const MAX_CHARS = 20_000

function truncate(text: string) {
  if (text.length <= MAX_CHARS) return text
  return `${text.slice(0, MAX_CHARS)}\n… [truncated ${text.length - MAX_CHARS} characters]`
}

const coordinates = {
  x: z.number().int().min(0).describe("Horizontal pixel position on the screen"),
  y: z.number().int().min(0).describe("Vertical pixel position on the screen"),
}

type Screenshot = {
  mediaType: "image/jpeg"
  data: string
  width?: number
  height?: number
}

async function takeScreenshot(): Promise<Screenshot> {
  const sandbox = await getDesktop()
  const [shot, info] = await Promise.all([
    sandbox.computerUse.screenshot.takeCompressed({
      format: "jpeg",
      quality: 70,
      showCursor: true,
    }),
    sandbox.computerUse.display.getInfo(),
  ])
  if (!shot.screenshot) throw new Error("The screenshot came back empty.")

  const display = info.displays?.[0]
  return {
    mediaType: "image/jpeg",
    data: shot.screenshot,
    width: display?.width,
    height: display?.height,
  }
}

// Sends the screenshot to the model as an image, not as base64 text.
function screenshotToModel({ output }: { output: Screenshot }) {
  const size =
    output.width && output.height
      ? `The screen is ${output.width}x${output.height} pixels.`
      : "Screenshot of the screen."
  return {
    type: "content" as const,
    value: [
      { type: "text" as const, text: size },
      {
        type: "file" as const,
        mediaType: output.mediaType,
        data: { type: "data" as const, data: output.data },
      },
    ],
  }
}

export const tools = {
  bash: tool({
    description:
      "Run a shell command in your sandbox and get its exit code and output. Commands time out after 2 minutes. DISPLAY is set to your desktop, so to open a GUI app start it in the background: `nohup firefox >/dev/null 2>&1 &`.",
    inputSchema: z.object({
      command: z.string().describe("The shell command to run"),
      cwd: z
        .string()
        .optional()
        .describe("Working directory. Defaults to /home/daytona."),
    }),
    execute: async ({ command, cwd }) => {
      const sandbox = await getSandbox()
      const response = await sandbox.process.executeCommand(
        command,
        cwd,
        { DISPLAY: ":0" },
        120
      )
      return { exitCode: response.exitCode, output: truncate(response.result) }
    },
  }),

  readFile: tool({
    description: "Read a text file from your sandbox.",
    inputSchema: z.object({
      path: z.string().describe("Path to the file"),
    }),
    execute: async ({ path }) => {
      const sandbox = await getSandbox()
      const file = await sandbox.fs.downloadFile(path)
      return { content: truncate(file.toString("utf8")) }
    },
  }),

  writeFile: tool({
    description:
      "Write a text file in your sandbox, creating it and its folders if needed and replacing it if it exists.",
    inputSchema: z.object({
      path: z.string().describe("Path to the file"),
      content: z.string().describe("The full contents of the file"),
    }),
    execute: async ({ path, content }) => {
      const sandbox = await getSandbox()
      await sandbox.fs.uploadFile(Buffer.from(content, "utf8"), path)
      return { bytes: Buffer.byteLength(content, "utf8") }
    },
  }),

  listFiles: tool({
    description: "List the files and folders in a folder of your sandbox.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("Path to the folder, for example /home/daytona"),
    }),
    execute: async ({ path }) => {
      const sandbox = await getSandbox()
      const files = await sandbox.fs.listFiles(path)
      return {
        entries: files
          .map((file) => ({
            name: file.name,
            isDir: file.isDir,
            size: file.size,
          }))
          .sort(
            (a, b) =>
              Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name)
          ),
      }
    },
  }),

  mouseClick: tool({
    description: "Click the mouse at a position on the screen.",
    inputSchema: z.object({
      ...coordinates,
      button: z.enum(["left", "right", "middle"]).default("left"),
      double: z.boolean().default(false).describe("Double-click"),
    }),
    execute: async ({ x, y, button, double }) => {
      const sandbox = await getDesktop()
      await sandbox.computerUse.mouse.click(x, y, button, double)
      return { x, y }
    },
  }),

  mouseMove: tool({
    description: "Move the mouse to a position on the screen, e.g. to hover.",
    inputSchema: z.object(coordinates),
    execute: async ({ x, y }) => {
      const sandbox = await getDesktop()
      await sandbox.computerUse.mouse.move(x, y)
      return { x, y }
    },
  }),

  mouseDrag: tool({
    description: "Press the left mouse button at one position and release it at another.",
    inputSchema: z.object({
      startX: coordinates.x,
      startY: coordinates.y,
      endX: coordinates.x,
      endY: coordinates.y,
    }),
    execute: async ({ startX, startY, endX, endY }) => {
      const sandbox = await getDesktop()
      await sandbox.computerUse.mouse.drag(startX, startY, endX, endY)
      return { x: endX, y: endY }
    },
  }),

  mouseScroll: tool({
    description: "Scroll the mouse wheel at a position on the screen.",
    inputSchema: z.object({
      ...coordinates,
      direction: z.enum(["up", "down"]),
      amount: z
        .number()
        .int()
        .min(1)
        .max(30)
        .default(3)
        .describe("Wheel ticks. One tick moves a few lines."),
    }),
    execute: async ({ x, y, direction, amount }) => {
      const sandbox = await getDesktop()
      await sandbox.computerUse.mouse.scroll(x, y, direction, amount)
      return { x, y }
    },
  }),

  keyboardType: tool({
    description:
      "Type text with the keyboard into whatever has focus. Newlines press Enter.",
    inputSchema: z.object({
      text: z.string().describe("The text to type"),
    }),
    execute: async ({ text }) => {
      const sandbox = await getDesktop()
      await sandbox.computerUse.keyboard.type(text)
      return { typed: text.length }
    },
  }),

  keyboardPress: tool({
    description:
      "Press a key, optionally with modifiers, e.g. enter, escape, tab, backspace, up, f5, or c with ctrl.",
    inputSchema: z.object({
      key: z.string().describe("The key to press, e.g. enter, a, f5, pagedown"),
      modifiers: z
        .array(z.enum(["ctrl", "alt", "shift", "cmd"]))
        .default([])
        .describe("Modifier keys held during the press"),
    }),
    execute: async ({ key, modifiers }) => {
      const sandbox = await getDesktop()
      await sandbox.computerUse.keyboard.press(key, modifiers)
      return { key, modifiers }
    },
  }),

  viewScreen: tool({
    description:
      "Take a screenshot so you can see the screen yourself. The user does not see it. Use it before acting on the screen and after, to check the result.",
    inputSchema: z.object({}),
    execute: takeScreenshot,
    toModelOutput: screenshotToModel,
  }),

  showScreen: tool({
    description:
      "Take a screenshot and show it to the user in the chat. Use it only when the user wants to see the screen or asks what is on it.",
    inputSchema: z.object({}),
    execute: takeScreenshot,
    toModelOutput: screenshotToModel,
  }),
} satisfies ToolSet
