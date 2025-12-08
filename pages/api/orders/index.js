// pages/api/orders/index.js
import { query } from "../../../lib/db-connector.js";

export default async function handler(req, res) {
  if (req.method === "POST") {
    return handleCreateOrder(req, res);
  }

  res.setHeader("Allow", ["POST"]);
  return res.status(405).json({
    error: `Method ${req.method} Not Allowed`,
  });
}

// Helper: map string size to integer code for DB
// Adjust these codes if your schema expects something different.
function mapSizeToInt(size) {
  if (!size) return null;
  switch (size) {
    case "Small":
      return 1;
    case "Medium":
      return 2;
    case "Large":
      return 3;
    default:
      return null; // unknown size → store NULL instead of crashing
  }
}

async function handleCreateOrder(req, res) {
  try {
    const {
      source = "kiosk",          // "kiosk" or "cashier"
      orderLocation = "Kiosk",   // e.g. "Front Counter"
      items = [],
      employeeID = null,         // cashier can send this later if desired
      customerEmail = null,      // optional; used for rewards, etc.
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in order" });
    }

    // Compute order total from line items
    const orderTotal = items.reduce(
      (sum, item) =>
        sum +
        Number(item.priceAtPurchase || 0) *
          Number(item.quantity || 0),
      0
    );

    // 1) Pick the next orderID based on current max
    const nextOrderResult = await query(
      "SELECT COALESCE(MAX(orderID), 0) + 1 AS nextId FROM ordertest"
    );
    const orderID = Number(nextOrderResult.rows[0].nextid);

    // 2) Insert into ordertest (matches databaseUpload.sql schema)
    await query(
      `
      INSERT INTO ordertest
        (orderID, employeeID, orderLocation, orderDate, orderTotal, orderComplete)
      VALUES
        ($1, $2, $3, NOW(), $4, FALSE)
      `,
      [orderID, employeeID, orderLocation, orderTotal]
    );

    // 3) Insert into orderItem
    //    Need safe new orderItemID values (PK, no sequence in schema)
    const nextItemResult = await query(
      "SELECT COALESCE(MAX(orderItemID), 0) AS maxId FROM orderItem"
    );
    let nextOrderItemID = Number(nextItemResult.rows[0].maxid) + 1;

    const valueStrings = [];
    const params = [];

    for (const item of items) {
      // Normalize/convert size for DB
      const normalizedSize = mapSizeToInt(item.size);

      // Build one row: (orderItemID, menuID, priceAtPurchase, quantityPurchased, orderID, orderSize)
      valueStrings.push(
        `($${params.length + 1}, $${params.length + 2}, $${params.length + 3}, $${params.length + 4}, $${params.length + 5}, $${params.length + 6})`
      );

      params.push(
        nextOrderItemID++,                 // orderItemID
        item.menuID,                       // menuID
        Number(item.priceAtPurchase || 0), // priceAtPurchase
        Number(item.quantity || 0),        // quantityPurchased
        orderID,                           // orderID (FK to ordertest)
        normalizedSize                     // orderSize as integer or null
      );
    }

    await query(
      `
      INSERT INTO orderItem
        (orderItemID, menuID, priceAtPurchase, quantityPurchased, orderID, orderSize)
      VALUES
        ${valueStrings.join(", ")}
      `,
      params
    );

    return res.status(201).json({
      success: true,
      orderID,
      orderTotal,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
}
