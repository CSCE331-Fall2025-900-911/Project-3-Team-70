// pages/api/menu/create.js
import { query } from "../../../lib/db-connector.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const {
      name,
      category,
      price,
      seasonalStart,
      seasonalEnd,
      ingredients
    } = req.body;

    const result = await query(`SELECT COALESCE(MAX(menuid), 0) + 1 AS nextid FROM menu;`);
    const nextMenuID = result.rows[0].nextid;


    await query(
      `
        INSERT INTO menu (menuid, menuname, category, price, seasonalstart, seasonalend)
        VALUES ($1, $2, $3, $4, $5, $6);
      `,
      [nextMenuID, name, category, price, seasonalStart, seasonalEnd]
    );


    for (const item of ingredients) {
      await query(
        `
          INSERT INTO menuinfo (menuinfoid, inventoryid, menuid, menuinfoquantity)
          VALUES (
            (SELECT COALESCE(MAX(menuinfoid), 0) + 1 FROM menuinfo),
            $1, $2, $3
          );
        `,
        [item.inventoryID, nextMenuID, item.quantity]
      );
    }

    return res.status(200).json({ success: true, menuID: nextMenuID });

  } catch (err) {
    console.error("Error creating menu item:", err);
    return res.status(500).json({ error: "Failed to create menu item" });
  }
}
