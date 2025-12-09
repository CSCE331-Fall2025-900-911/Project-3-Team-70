import { query } from "../../lib/db-connector.js";

export default async function handler(req, res) {
  try {
    const result = await query(
      `SELECT 
        m.menuID AS id,
        m.menuName AS name,
        m.category,
        m.price,
        m.menuImage AS image,
        m.menuDescription AS description,
        m.seasonalStart,
        m.seasonalEnd,
        COALESCE(
          json_agg(DISTINCT i.allergy) 
            FILTER (WHERE i.allergy IS NOT NULL),
          '[]'
        ) AS allergies
      FROM menu m
      LEFT JOIN menuinfo mi ON mi.menuID = m.menuID
      LEFT JOIN inventory i ON i.inventoryID = mi.inventoryID
      WHERE m.isActive = TRUE
      GROUP BY m.menuID
      ORDER BY m.menuID;`
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to load menu data." });
  }
}
