import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query } from "../../../lib/db-connector";

// IMPORTANT:
// This file must be located at:
// /pages/api/auth/[...nextauth].js

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  // ==========================
  //      MAIN CALLBACKS
  // ==========================
  callbacks: {
    // Runs ONLY on successful login
    async signIn({ user }) {
      // Insert new Google user into DB if they do not exist already
      await query(
        `
        INSERT INTO app_users (email, name, image)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO NOTHING
        `,
        [user.email, user.name, user.image]
      );

      return true; // allow login
    },

    // Attaches database values to JWT
    async jwt({ token }) {
      if (token.email) {
        const { rows } = await query(
          `SELECT role FROM app_users WHERE email = $1`,
          [token.email]
        );

        token.role = rows[0]?.role || "customer"; // default if not found
      }

      return token;
    },

    // Attaches JWT → session object sent to frontend
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
  },

  // ==========================
  //      CUSTOM PAGES
  // ==========================
  pages: {
    signIn: "/login",
  },

  // ==========================
  //          SECURITY
  // ==========================
  secret: process.env.NEXTAUTH_SECRET,
});
