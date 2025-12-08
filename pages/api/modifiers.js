// pages/api/modifiers.js
import { query } from "../../lib/db-connector.js";

export default async function handler(req, res) {
  try {
    const result = await query(
      `
      SELECT inventoryname
      FROM inventory
      ORDER BY inventoryname ASC;
      `
    );

    const allNames = result.rows
      .map((r) => r.inventoryname)
      .filter((n) => typeof n === "string" && n.trim().length > 0);

    // Filter out obvious non-ingredient / material items
    const excluded = new Set([
      "Small cups",
      "Medium cups",
      "Large cups",
      "Lids",
      "Straws",
      "Drink Holder",
    ]);

    const toppings = allNames.filter((name) => !excluded.has(name));

    res.status(200).json({ toppings });
  } catch (err) {
    console.error("Modifier load failed:", err);
    res.status(500).json({ error: "Failed to load modifiers" });
  }
}
