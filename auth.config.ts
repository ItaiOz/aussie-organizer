import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLogin = request.nextUrl.pathname === "/login";
      const isAuthed = !!auth?.user;
      if (isLogin) return isAuthed ? Response.redirect(new URL("/", request.nextUrl)) : true;
      return isAuthed;
    },
    async jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role ?? "manager";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = (token.role as string) ?? "manager";
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};
