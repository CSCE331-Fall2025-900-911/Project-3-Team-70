// pages/staff/after-login.js
import { getSession } from "next-auth/react";
import { query } from "../../lib/db-connector";

export async function getServerSideProps(ctx) {
  const session = await getSession(ctx);

  if (!session) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  const { role } = ctx.query;
  const email = session.user.email;

  if (role === "manager" || role === "employee") {
    await query(
      `UPDATE app_users SET userRole = $1 WHERE userEmail = $2`,
      [role, email]
    );
  }

  if (role === "manager") {
    return { redirect: { destination: "/manager", permanent: false } };
  }

  if (role === "employee") {
    return { redirect: { destination: "/cashier", permanent: false } };
  }

  // Fallback: just go to kiosk
  return { redirect: { destination: "/kiosk", permanent: false } };
}

export default function AfterLoginPage() {
  return null;
}
