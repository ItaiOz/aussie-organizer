import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLogin = pathname === "/login";
      const isAuthed = !!auth?.user;
      const isStaff = (auth?.user as { role?: string } | undefined)?.role === "staff";
      if (isLogin) {
        return isAuthed ? Response.redirect(new URL(isStaff ? "/entry" : "/", request.nextUrl)) : true;
      }
      if (!isAuthed) return false;
      // Staff can only use the daily-entry screen
      if (isStaff && pathname !== "/entry") return Response.redirect(new URL("/entry", request.nextUrl));
      return true;
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
