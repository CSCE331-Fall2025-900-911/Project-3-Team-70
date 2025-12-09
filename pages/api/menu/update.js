import { query } from "../../../lib/db-connector.js";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, name, category, price, description, seasonalStart, seasonalEnd } = req.body;

    await query(
      `
        UPDATE menu
        SET menuname = $1,
            category = $2,
            price = $3,
            menudescription = $4,
            seasonalstart = $5,
            seasonalend = $6
        WHERE menuid = $7
      `,
      [name, category, price, description, seasonalStart, seasonalEnd, id]
    );

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Error updating menu item:", err);
    return res.status(500).json({ error: "Failed to update menu item" });
  }
}
