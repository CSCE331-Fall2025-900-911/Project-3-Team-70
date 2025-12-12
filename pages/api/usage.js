import { query } from "../../lib/db-connector.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: "Start and end required" });
  }

  try {
    const sql = `
    SELECT
        i.inventoryID,
        i.inventoryName,
        SUM(usage.amount) AS totalUsed,
        i.unit
    FROM (
        -- INGREDIENT USAGE FROM MENU ITEMS
        SELECT
        mi.inventoryID,
        mi.menuInfoQuantity * oi.quantityPurchased AS amount
        FROM ordertest o
        JOIN orderItem oi ON o.orderID = oi.orderID
        JOIN menuInfo mi ON oi.menuID = mi.menuID
        WHERE o.orderDate >= $1 AND o.orderDate < $2

        UNION ALL

        -- MODIFICATION (TOPPING) USAGE
        SELECT
        m.inventoryID,
        m.modificationQuantity AS amount
        FROM ordertest o
        JOIN orderItem oi ON o.orderID = oi.orderID
        JOIN modification m ON m.orderItemID = oi.orderItemID
        WHERE o.orderDate >= $1 AND o.orderDate < $2
    ) usage
    JOIN inventory i ON usage.inventoryID = i.inventoryID
    WHERE i.unit NOT IN ('mod', 'archived')
    GROUP BY i.inventoryID, i.inventoryName, i.unit
    ORDER BY i.inventoryName;
    `;

    const rows = (await query(sql, [start, end])).rows;
    res.status(200).json(rows);

  } catch (err) {
    console.error("Usage report error:", err);
    res.status(500).json({ error: "Database error" });
  }
}
