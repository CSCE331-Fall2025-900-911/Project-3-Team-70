// pages/staff/after-login.js
import { getSession } from "next-auth/react";
import { query } from "../../lib/db-connector.js"

export async function getServerSideProps(ctx) {
  const session = await getSession(ctx);
  const role = ctx.query.role;

  if (!session?.user?.email || !role) {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  if (role !== "employee" && role !== "manager") {
    return {
      redirect: { destination: "/unauthorized", permanent: false },
    };
  }

  // Update app_users with the chosen staff role
  await query(
    `UPDATE app_users SET userRole = $1 WHERE userEmail = $2`,
    [role, session.user.email]
  );

  const destination = role === "manager" ? "/manager" : "/cashier";

  return {
    redirect: { destination, permanent: false },
  };
}

export default function AfterLoginPage() {
  // This page always redirects server-side; we never render UI.
  return null;
}
