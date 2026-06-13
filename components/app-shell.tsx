"use client";

import { useState } from "react";
import { NavLinks } from "./nav";
import { Button } from "./ui/button";
import { Wallet, Menu, X, LogOut } from "lucide-react";

export function AppShell({
  children,
  email,
  signOutAction,
}: {
  children: React.ReactNode;
  email: string | null | undefined;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const Brand = (
    <div className="flex items-center gap-2 px-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
        <Wallet className="h-4 w-4 text-primary" />
      </div>
      <span className="text-lg font-semibold tracking-tight">Paisa</span>
    </div>
  );

  const Footer = (
    <form action={signOutAction} className="border-t border-border p-3">
      <div className="mb-2 truncate px-2 text-xs text-muted-2" title={email ?? ""}>
        {email}
      </div>
      <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </form>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/50 md:flex">
        <div className="flex h-16 items-center">{Brand}</div>
        <div className="flex-1 overflow-y-auto px-3">
          <NavLinks />
        </div>
        {Footer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface">
            <div className="flex h-16 items-center justify-between pr-3">
              {Brand}
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            {Footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          {Brand}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
