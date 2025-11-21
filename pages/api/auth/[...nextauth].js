import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query } from "../../../lib/db-connector";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    // 1. Run when user logs in
    async signIn({ user }) {
      await query(
        `
        INSERT INTO app_users (userEmail, userName)
        VALUES ($1, $2)
        ON CONFLICT (userEmail) DO NOTHING
        `,
        [user.email, user.name]
      );

      return true;
    },

    // 2. Attach database info into JWT
    async jwt({ token }) {
      if (token.email) {
        const { rows } = await query(
          `SELECT userRole FROM app_users WHERE userEmail = $1`,
          [token.email]
        );

        token.role = rows[0]?.userrole || "customer";
      }

      return token;
    },

    // 3. Make role available on client-side session
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
});
