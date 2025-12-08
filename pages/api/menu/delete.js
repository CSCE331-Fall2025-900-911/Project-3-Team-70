import { query } from "../../../lib/db-connector";

export default async function handler(req, res) {

  console.log("REQUEST BODY:", req.body);   // ← ADD THIS LINE HERE

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { menuID } = req.body;

    if (!menuID) {
      return res.status(400).json({ error: "Menu ID required" });
    }

    await query("DELETE FROM menu WHERE menuid = $1", [menuID]);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
