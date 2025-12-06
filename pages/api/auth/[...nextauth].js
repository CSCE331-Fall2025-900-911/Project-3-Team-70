// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query } from "../../../lib/db-connector";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    // Ensure user exists on first sign-in
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

    // Populate JWT with role + loyalty points
    async jwt({ token }) {
      if (token.email) {
        const { rows } = await query(
          `SELECT userRole, loyaltyPoints FROM app_users WHERE userEmail = $1`,
          [token.email]
        );
        const row = rows[0];
        token.role = row?.userrole || "customer";
        token.loyaltyPoints = row?.loyaltypoints ?? 0;
      }
      return token;
    },

    // Expose role + points to the client session
    async session({ session, token }) {
      session.user.role = token.role || "customer";
      session.user.loyaltyPoints = token.loyaltyPoints ?? 0;
      return session;
    },
  },

  pages: {
    // signIn: "/login", // you can ignore this if you don't have a custom /login page
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
