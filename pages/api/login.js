// pages/api/login.js
import { query } from '../../lib/db-connector.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { role, password } = req.body;

  try {
    const sql = `
      SELECT employeeid, employeename, role
      FROM employee
      WHERE role = $1 AND password = $2
      LIMIT 1;
    `;

    const { rows } = await query(sql, [role, password]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    return res.status(200).json({
      success: true,
      user: rows[0]
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
