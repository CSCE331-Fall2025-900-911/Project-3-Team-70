// pages/api/modifiers.js
import { query } from "../../lib/db-connector.js";

export default async function handler(req, res) {
  try {
    const result = await query(`
      SELECT 
        inventoryID AS id,
        inventoryName AS name,
        addonprice AS price,
        allergy
      FROM inventory
      WHERE isTopping = TRUE
      ORDER BY inventoryName ASC;
    `);

    res.status(200).json({ toppings: result.rows });
  } catch (err) {
    console.error("Modifier load failed:", err);
    res.status(500).json({ error: "Failed to load modifiers" });
  }
}
