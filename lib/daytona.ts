import "server-only"

import { Daytona, DaytonaNotFoundError } from "@daytona/sdk"

// Reads DAYTONA_API_KEY from the environment. The SDK refuses an endpoint it
// can't attribute (Next.js copies .env.local into process.env), so the app
// names its own.
const daytona = new Daytona({ apiUrl: process.env.DAYTONA_API_URL })

export async function createSandbox(labels: Record<string, string>) {
  const sandbox = await daytona.create({ labels })
  return sandbox.id
}

// Already gone counts as deleted.
export async function deleteSandbox(sandboxId: string) {
  try {
    const sandbox = await daytona.get(sandboxId)
    await daytona.delete(sandbox)
  } catch (error) {
    if (!(error instanceof DaytonaNotFoundError)) throw error
  }
}

// A noVNC URL for the sandbox's desktop, starting the sandbox and its desktop
// (Xvfb, xfce4, VNC) if needed. The token is in the URL, so it can go straight
// into an iframe.
export async function getDesktopUrl(sandboxId: string) {
  const sandbox = await daytona.get(sandboxId)
  if (sandbox.state !== "started") await sandbox.start()

  if ((await sandbox.computerUse.getStatus()).status !== "active") {
    await sandbox.computerUse.start()
    for (let attempt = 0; ; attempt++) {
      if (attempt === 20) throw new Error("The desktop didn't start in time.")
      await new Promise((resolve) => setTimeout(resolve, 500))
      if ((await sandbox.computerUse.getStatus()).status === "active") break
    }
  }

  const { url } = await sandbox.getSignedPreviewUrl(6080, 60 * 60 * 24)
  const params = new URLSearchParams({
    autoconnect: "true",
    reconnect: "true",
    resize: "scale",
  })
  return `${url}/vnc.html?${params}`
}
