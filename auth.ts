import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase().trim();

/**
 * Dev-only sign-in. Hard-fenced: only active when NOT in production AND the
 * DEV_AUTH flag is explicitly set. On Vercel, NODE_ENV is always "production",
 * so this can never be active there — production uses Google + the email gate.
 */
const devAuthEnabled =
  process.env.NODE_ENV !== "production" && process.env.DEV_AUTH === "1";

const providers: Provider[] = [Google];
if (devAuthEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Developer login",
      credentials: {},
      authorize: async () => ({
        id: "dev-user",
        name: "Developer",
        email: allowedEmail ?? "dev@example.com",
      }),
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * Single-user gate: only the one configured email may sign in. Every other
     * Google account is rejected before a session is ever created.
     */
    async signIn({ account, profile, user }) {
      if (account?.provider === "dev" && devAuthEnabled) return true;
      const email = (profile?.email ?? user?.email ?? "").toLowerCase().trim();
      if (!allowedEmail) return false; // fail closed if misconfigured
      return email === allowedEmail;
    },
  },
  pages: { signIn: "/signin" },
});
