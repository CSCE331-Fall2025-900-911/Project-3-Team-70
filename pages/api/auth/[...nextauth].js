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
      try {
        if (user?.email) {
          token.email = user.email;
        }

        if (token.email) {
          const result = await query(
            "SELECT userRole FROM app_users WHERE userEmail = $1",
            [token.email]
          );

          const dbRole =
            result.rows && result.rows[0]
              ? result.rows[0].userrole
              : null;

          token.role = dbRole || "customer";
        } else {
          token.role = token.role || "customer";
        }
      } catch (err) {
        console.error("Error in jwt callback:", err);
        token.role = token.role || "customer";
      }

      return token;
    },

    // Expose role to the client
    async session({ session, token }) {
      session.user.role = token.role || "customer";
      session.user.email = token.email || session.user.email;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);