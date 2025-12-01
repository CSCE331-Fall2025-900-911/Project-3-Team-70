// pages/api/auth/[...nextauth].js
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
    // Ensure user row exists on first sign-in
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

    // Load role from DB into JWT
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

    // Expose role to client
    async session({ session, token }) {
      session.user.role = token.role || "customer";
      return session;
    },
  },

  pages: {
    signIn: "/login", // optional, you can ignore this page if not using it
  },

  secret: process.env.NEXTAUTH_SECRET,
});
