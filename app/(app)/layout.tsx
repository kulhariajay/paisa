import { auth, signOut } from "@/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <AppShell email={session?.user?.email} signOutAction={doSignOut}>
      {children}
    </AppShell>
  );
}
