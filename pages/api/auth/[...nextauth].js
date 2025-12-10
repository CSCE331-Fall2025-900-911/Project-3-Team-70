// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query } from "../../../lib/db-connector.js";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    // Ensure a row exists in app_users for this email
    async signIn({ user }) {
      try {
        if (user?.email) {
          await query(
            `
            INSERT INTO app_users (userEmail, userName)
            VALUES ($1, $2)
            ON CONFLICT (userEmail) DO NOTHING
          `,
            [user.email, user.name || null]
          );
        }
      } catch (err) {
        console.error("Error in signIn callback:", err);
      }
      return true;
    },

    // Attach role from DB to the JWT
    async jwt({ token, user }) {
      const email = user?.email || token?.email;

      if (email) {
        token.email = email;
        try {
          const result = await query(
            "SELECT userRole FROM app_users WHERE userEmail = $1",
            [email]
          );
          const dbRole =
            result.rows?.[0]?.userrole ||
            result.rows?.[0]?.userRole ||
            "customer";
          token.role = dbRole;
        } catch (err) {
          console.error("Error loading userRole for JWT:", err);
          token.role = token.role || "customer";
        }
      }

      return token;
    },

    // Put role into session.user.role
    async session({ session, token }) {
      if (token?.email) {
        session.user.email = token.email;
      }
      session.user.role = token?.role || "customer";
      return session;
    },
  },
};

export default NextAuth(authOptions);
