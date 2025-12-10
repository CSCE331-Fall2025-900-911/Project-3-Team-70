import { query } from "../../../lib/db-connector.js";

export default async function handler(req, res) {
  try {
    const { menuID } = req.query;

    if (!menuID) {
      return res.status(400).json({ error: "menuID is required" });
    }

    const result = await query(
      `
      SELECT 
        mi.inventoryID,
        mi.menuInfoQuantity AS quantity,
        inv.inventoryName,
        inv.unit
      FROM menuInfo mi
      JOIN inventory inv ON inv.inventoryID = mi.inventoryID
      WHERE mi.menuID = $1
      ORDER BY inv.inventoryName;
      `,
      [menuID]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error loading ingredients:", err);
    res.status(500).json({ error: "Server error" });
  }
}
