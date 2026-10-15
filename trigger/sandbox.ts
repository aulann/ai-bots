import { Daytona } from "@daytona/sdk"
import { chat } from "@trigger.dev/sdk/ai"

// Reads DAYTONA_API_KEY from the environment. The SDK refuses an endpoint it
// can't attribute (trigger dev copies .env.local into process.env), so the
// app names its own.
const daytona = new Daytona({ apiUrl: process.env.DAYTONA_API_URL })

// The chat's bot's sandbox, set once per run in onBoot.
export const botSandbox = chat.local<{ id: string }>({ id: "botSandbox" })

// The sandbox, started if it stopped while idle.
export async function getSandbox() {
  const sandbox = await daytona.get(botSandbox.id)
  if (sandbox.state !== "started") await sandbox.start()
  return sandbox
}

// The sandbox with its desktop (Xvfb, xfce4, VNC) running. The desktop takes
// a few seconds to come up, so wait for it before acting on it.
export async function getDesktop() {
  const sandbox = await getSandbox()
  if ((await sandbox.computerUse.getStatus()).status === "active") return sandbox

  await sandbox.computerUse.start()
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    if ((await sandbox.computerUse.getStatus()).status === "active") {
      return sandbox
    }
  }
  throw new Error("The desktop didn't start in time.")
}
