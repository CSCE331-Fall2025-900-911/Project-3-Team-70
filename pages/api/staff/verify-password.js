// pages/api/staff/verify-password.js

/**
 * Body:
 * {
 *   password: string,
 *   requestedRole: "manager" | "employee"
 * }
 */
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { password, requestedRole } = req.body || {};

  if (!password || !requestedRole) {
    return res
      .status(400)
      .json({ error: "Missing password or requestedRole" });
  }

  const employeePw = process.env.EMPLOYEE_ACCESS_PASSWORD;
  const managerPw = process.env.MANAGER_ACCESS_PASSWORD;

  try {
    if (requestedRole === "manager") {
      if (password === managerPw) {
        return res.status(200).json({ ok: true });
      }
      return res.status(401).json({ error: "Invalid manager password" });
    }

    if (requestedRole === "employee") {
      if (password === employeePw) {
        return res.status(200).json({ ok: true });
      }
      return res
        .status(401)
        .json({ error: "Invalid employee password" });
    }

    return res.status(400).json({ error: "Unknown role" });
  } catch (err) {
    console.error("Error verifying staff password:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
