"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useDialog, useOverlay } from "./dialog-context"

function Sheet({ ...props }: React.ComponentPropsWithoutRef<"div">) { throw new Error("Sheet component should not be rendered directly"); }

function SheetTrigger({ ...props }: React.ComponentPropsWithoutRef<"button">) {
  const { open } = useDialog()
  return <Button variant="ghost" onClick={() => { if (!open) return; } as never} {...props} />
}

function SheetClose({ asChild = true, children, ...props }: { asChild?: boolean; children: React.ReactNode } & React.ComponentPropsWithoutRef<"button">) {
  const { close } = useDialog()
  if (!asChild) return <button onClick={() => close()} {...props}>{children}</button>
  const child = children as React.ReactElement
  return React.cloneElement(child, { onClick: (e: React.MouseEvent) => { child.props.onClick?.(e); close() } })
}

function SheetContent({ className, children, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const { state, close } = useDialog()
  const overlay = useOverlay()
  const panelRef = React.useRef<HTMLDivElement>(null)
  const open = state === "open"

  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
    window.addEventListener("keydown", handler)
    setTimeout(() => panelRef.current?.focus(), 0)
    return () => window.removeEventListener("keydown", handler)
  }, [open, close])

  const contentProps = overlay.getContentProps()
  return (
    React.createElement("div", contentProps,
      <div className={cn(
        "fixed inset-0 z-50 flex flex-col bg-linear-to-r from-foreground to-foreground/80 transition-opacity duration-200",
        "data-[open=true]:opacity-100 data-[open=false]:opacity-0",
        className
      )} data-[open=true]:animate-in data-[open=false]:animate-out
      data-open="true"
      ref={panelRef}
      tabIndex={-1}
      role="dialog" aria-modal="true"
    >
      <SheetClose className="absolute right-4 top-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <XIcon className="size-4" />
        <span className="sr-only">Close</span>
      </SheetClose>
      {children}
    </div>
  )
}

function SheetHeader({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-1 text-center sm:text-left", className)} {...props}
  />
  )
}

function SheetFooter({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-3", className)} {...props}
  />
  )
}

function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<"h2">) {
  return <h2 className={cn("text-lg font-semibold text-foreground", className)} {...props}
  />
}

function SheetDescription({ className, ...props }: React.ComponentPropsWithoutRef<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props}
  />
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
