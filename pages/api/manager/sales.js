// pages/api/manager/sales.js
import { query } from "../../../lib/db-connector.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Only show orders that the kitchen has completed
    const { rows } = await query(
      `
      SELECT
        o.orderID,
        o.orderDate,
        m.menuName AS item,
        SUM(oi.quantityPurchased) AS qty,
        SUM(oi.quantityPurchased * oi.priceAtPurchase) AS total
      FROM ordertest o
      JOIN orderItem oi ON o.orderID = oi.orderID
      JOIN menu m ON oi.menuID = m.menuID
      WHERE o.orderComplete = TRUE
      GROUP BY o.orderID, o.orderDate, m.menuName
      ORDER BY o.orderDate DESC, o.orderID DESC;
      `
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching manager sales:", err);
    res.status(500).json({ error: "Failed to load sales" });
  }
}
