import { query } from "../../../lib/db-connector.js";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      id,
      name,
      category,
      price,
      description,
      seasonalStart,
      seasonalEnd,
      ingredients = []
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing menu ID" });
    }

    // ---- UPDATE MENU METADATA ----
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

    // ---- DELETE EXISTING INGREDIENTS ----
    await query(
      `DELETE FROM menuInfo WHERE menuID = $1`,
      [id]
    );

    // ---- INSERT UPDATED INGREDIENTS ----
    for (const ing of ingredients) {
      if (Number(ing.quantity) > 0) {
        await query(
          `
          INSERT INTO menuInfo (menuInfoID, inventoryID, menuID, menuInfoQuantity)
          VALUES (
            (SELECT COALESCE(MAX(menuInfoID), 0) + 1 FROM menuInfo),
            $1,
            $2,
            $3
          )
          `,
          [ing.inventoryID, id, ing.quantity]
        );
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("UPDATE MENU ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
