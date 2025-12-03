// pages/api/toppings.js
import { query } from "../../lib/db-connector";

export default async function handler(req, res) {
  try {
    const { rows } = await query(
      `
      SELECT inventoryID, inventoryName, addOnPrice, allergy
      FROM inventory
      WHERE addOnPrice IS NOT NULL
        AND addOnPrice > 0
      ORDER BY inventoryName;
      `
    );

    res.status(200).json(
      rows.map((r) => ({
        inventoryID: r.inventoryid,
        inventoryName: r.inventoryname,
        addOnPrice: Number(r.addonprice || 0),
        allergy: r.allergy,
      }))
    );
  } catch (err) {
    console.error("Error fetching toppings:", err);
    res.status(500).json({ error: "Failed to load toppings." });
  }
}
