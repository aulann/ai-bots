"use client"

import { cn } from "cn"
import { MonitorIcon } from "lucide-react"
import { createContext, use, useEffect, useRef, useState } from "react"

import { getChatDesktopUrl } from "@/actions/chat"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable"
import { Spinner } from "@/components/ui/spinner"

type Desktop =
  | { status: "idle" | "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; error: string }

const DesktopPanelContext = createContext<{
  name: string
  open: boolean
  toggle: () => void
  desktop: Desktop
  setPanelSlot: (slot: HTMLElement | null) => void
  openDialog: () => void
} | null>(null)

function useDesktopPanel() {
  const context = use(DesktopPanelContext)
  if (!context) {
    throw new Error("useDesktopPanel must be used within DesktopPanelProvider.")
  }
  return context
}

// Owns the bot's desktop: the panel's open state, the noVNC URL, and the one
// iframe that shows it. The iframe never moves in the DOM (moving an iframe
// reloads it), it's positioned over whichever slot is showing it instead: the
// thumbnail in the panel, or the full-size view in the dialog.
export function DesktopPanelProvider({
  chatId,
  name,
  children,
}: {
  chatId: string
  name: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [desktop, setDesktop] = useState<Desktop>({ status: "idle" })
  const [panelSlot, setPanelSlot] = useState<HTMLElement | null>(null)
  const [dialogSlot, setDialogSlot] = useState<HTMLElement | null>(null)

  // Load the desktop the first time the panel opens, then keep it.
  useEffect(() => {
    if (!open || desktop.status !== "idle") return
    setDesktop({ status: "loading" })
    getChatDesktopUrl(chatId).then((result) =>
      setDesktop(
        result.success
          ? { status: "ready", url: result.url }
          : { status: "error", error: result.error }
      )
    )
  }, [open, desktop.status, chatId])

  const slot = dialogOpen && dialogSlot ? dialogSlot : panelSlot

  return (
    <DesktopPanelContext
      value={{
        name,
        open,
        toggle: () => setOpen((o) => !o),
        desktop,
        setPanelSlot,
        openDialog: () => setDialogOpen(true),
      }}
    >
      {children}
      {desktop.status === "ready" && (
        <DesktopFrame
          url={desktop.url}
          slot={slot}
          interactive={slot === dialogSlot}
          title={`${name}'s screen`}
        />
      )}
      <Dialog
        open={dialogOpen}
        // Not modal: a modal dialog traps focus and makes the rest of the page
        // inert, and the iframe lives outside the dialog.
        modal={false}
        disablePointerDismissal
        // Keys and clicks meant for the desktop must never close it, so only
        // the close button does.
        onOpenChange={(next, { reason }) => {
          if (next || reason === "close-press") setDialogOpen(next)
        }}
      >
        <DialogContent className="sm:max-w-[min(64rem,calc((100svh-6rem)*4/3))]">
          <DialogHeader>
            <DialogTitle>{name}&apos;s screen</DialogTitle>
          </DialogHeader>
          <div
            ref={setDialogSlot}
            className="aspect-4/3 w-full rounded-lg bg-muted"
          />
        </DialogContent>
      </Dialog>
    </DesktopPanelContext>
  )
}

// Follows the slot's position every frame, so it keeps up with panel resizes
// and the dialog's open animation.
function DesktopFrame({
  url,
  slot,
  interactive,
  title,
}: {
  url: string
  slot: HTMLElement | null
  interactive: boolean
  title: string
}) {
  const ref = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = ref.current
    if (!iframe || !slot) return

    let frame = requestAnimationFrame(function follow() {
      const rect = slot.getBoundingClientRect()
      iframe.style.top = `${rect.top}px`
      iframe.style.left = `${rect.left}px`
      iframe.style.width = `${rect.width}px`
      iframe.style.height = `${rect.height}px`
      frame = requestAnimationFrame(follow)
    })
    return () => cancelAnimationFrame(frame)
  }, [slot])

  return (
    <iframe
      ref={ref}
      srcDoc={skipPreviewWarning(url)}
      title={title}
      tabIndex={interactive ? 0 : -1}
      aria-hidden={!slot}
      className={cn(
        "fixed rounded-lg border-0",
        !slot && "invisible",
        // Above the dialog while in it, otherwise just a picture.
        interactive ? "z-60" : "pointer-events-none z-10"
      )}
    />
  )
}

// Daytona shows a warning page before a preview the first time a browser opens
// it, and an iframe can't send the X-Daytona-Skip-Preview-Warning header. So
// the iframe starts on a page that does what the warning's "Continue" button
// does: post to the accept endpoint, which sets a cookie and redirects to url.
function skipPreviewWarning(url: string) {
  const accept = `${new URL(url).origin}/accept-daytona-preview-warning?redirect=${encodeURIComponent(url)}`
  return `<!doctype html><body style="background:#000"><form method="post" action="${accept}"></form><script>document.forms[0].submit()</script></body>`
}

export function DesktopPanelToggle({ className }: { className?: string }) {
  const { open, toggle } = useDesktopPanel()

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-pressed={open}
      onClick={toggle}
    >
      <MonitorIcon className="size-5" />
      <span className="sr-only">Desktop</span>
    </Button>
  )
}

export function DesktopPanel() {
  const { name, open, desktop, setPanelSlot, openDialog } = useDesktopPanel()
  if (!open) return null

  return (
    <>
      <ResizableHandle />
      <ResizablePanel id="desktop" defaultSize="12" minSize="8">
        <div className="flex flex-col gap-2 p-2">
          <button
            type="button"
            onClick={openDialog}
            disabled={desktop.status !== "ready"}
            className="rounded-xl border bg-muted p-1.5 outline-none hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              ref={setPanelSlot}
              className="flex aspect-4/3 w-full items-center justify-center rounded-lg text-center text-xs text-muted-foreground"
            >
              {desktop.status === "error" ? (
                desktop.error
              ) : desktop.status !== "ready" ? (
                <Spinner />
              ) : null}
            </span>
            <span className="sr-only">Open {name}&apos;s screen</span>
          </button>
          <p className="truncate text-center text-xs text-muted-foreground">
            {name}&apos;s screen
          </p>
        </div>
      </ResizablePanel>
    </>
  )
}
