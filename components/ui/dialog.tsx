"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small controlled modal. `trigger` opens it; the form inside calls
 * `onSubmitAction` (a server action) and the dialog closes on success.
 */
export function FormDialog({
  trigger,
  title,
  description,
  children,
  action,
  submitLabel = "Save",
  submitVariant = "primary",
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  action: (fd: FormData) => Promise<void>;
  submitLabel?: string;
  submitVariant?: "primary" | "danger";
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !pending && setOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md animate-fadeup rounded-t-2xl border border-border bg-surface p-5 shadow-xl sm:rounded-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">{title}</h2>
                  {description && (
                    <p className="mt-1 text-sm text-muted">{description}</p>
                  )}
                </div>
                <button
                  onClick={() => !pending && setOpen(false)}
                  className="text-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                action={async (fd) => {
                  setError(null);
                  setPending(true);
                  try {
                    await action(fd);
                    setOpen(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Something went wrong");
                  } finally {
                    setPending(false);
                  }
                }}
                className="space-y-3"
              >
                {children}
                {error && (
                  <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant={submitVariant} disabled={pending}>
                    {pending ? "Saving…" : submitLabel}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Inline confirm-and-run button for simple destructive/irreversible actions. */
export function ConfirmButton({
  children,
  onConfirm,
  message,
  className,
  variant = "ghost",
}: {
  children: React.ReactNode;
  onConfirm: () => Promise<void>;
  message?: string;
  className?: string;
  variant?: "ghost" | "danger" | "outline" | "subtle" | "primary";
}) {
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={cn(className)}
      disabled={pending}
      onClick={async () => {
        if (message && !window.confirm(message)) return;
        setPending(true);
        try {
          await onConfirm();
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
    </Button>
  );
}
