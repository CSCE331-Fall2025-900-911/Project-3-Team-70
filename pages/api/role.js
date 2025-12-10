// pages/api/role.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth].js";
import { query } from "../../lib/db-connector.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ error: `Method ${req.method} not allowed` });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { role } = req.body || {};
  const allowedRoles = ["customer", "employee", "manager"];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    await query(
      "UPDATE app_users SET userRole = $1 WHERE userEmail = $2",
      [role, session.user.email]
    );
    return res.status(200).json({ success: true, role });
  } catch (err) {
    console.error("Error updating role:", err);
    return res.status(500).json({ error: "Failed to update role" });
  }
}
