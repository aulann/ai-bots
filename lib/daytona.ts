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
