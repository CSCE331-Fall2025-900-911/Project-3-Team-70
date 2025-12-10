// pages/api/verify-password.js
export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ error: `Method ${req.method} not allowed` });
  }

  const { role, password } = req.body || {};

  if (!role || !password) {
    return res.status(400).json({ error: "Missing role or password" });
  }

  let expected;
  if (role === "employee") {
    expected = process.env.EMPLOYEE_PASSWORD;
  } else if (role === "manager") {
    expected = process.env.MANAGER_PASSWORD;
  } else {
    return res.status(400).json({ error: "Invalid role" });
  }

  if (!expected) {
    console.error(`Missing env var for ${role} password.`);
    return res
      .status(500)
      .json({ error: "Server not configured for this role" });
  }

  if (password === expected) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: "Incorrect password" });
}
