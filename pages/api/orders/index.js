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
      source = "kiosk",
      orderLocation = "Kiosk",
      items = [],
<<<<<<< HEAD
      employeeID = null,         // cashier can send this later if desired
      customerEmail = null,      // optional; used for rewards, etc.
=======
      employeeID = null,
>>>>>>> origin/manager
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in order" });
    }

    // Compute order total
    const orderTotal = items.reduce(
      (sum, item) =>
        sum +
        Number(item.priceAtPurchase || 0) *
          Number(item.quantity || 0),
      0
    );

    const nextOrderResult = await query(
      "SELECT COALESCE(MAX(orderID), 0) + 1 AS nextId FROM ordertest"
    );
    const orderID = Number(nextOrderResult.rows[0].nextid);

    // 2) Insert into ordertest
    await query(
      `
      INSERT INTO ordertest
        (orderID, employeeID, orderLocation, orderDate, orderTotal, orderComplete)
      VALUES
        ($1, $2, $3, NOW(), $4, FALSE)
      `,
      [orderID, employeeID, orderLocation, orderTotal]
    );

    // 3) Prepare orderItem insert
    const nextItemResult = await query(
      "SELECT COALESCE(MAX(orderItemID), 0) AS maxId FROM orderItem"
    );
    let nextOrderItemID = Number(nextItemResult.rows[0].maxid) + 1;

    const valueStrings = [];
    const params = [];

    for (const item of items) {
<<<<<<< HEAD
      // Normalize/convert size for DB
      const normalizedSize = mapSizeToInt(item.size);

      // Build one row: (orderItemID, menuID, priceAtPurchase, quantityPurchased, orderID, orderSize)
=======
>>>>>>> origin/manager
      valueStrings.push(
        `($${params.length + 1}, $${params.length + 2}, $${params.length + 3}, $${params.length + 4}, $${params.length + 5}, $${params.length + 6})`
      );

      params.push(
<<<<<<< HEAD
        nextOrderItemID++,                 // orderItemID
        item.menuID,                       // menuID
        Number(item.priceAtPurchase || 0), // priceAtPurchase
        Number(item.quantity || 0),        // quantityPurchased
        orderID,                           // orderID (FK to ordertest)
        normalizedSize                     // orderSize as integer or null
=======
        nextOrderItemID++,                 
        item.menuID,
        Number(item.priceAtPurchase || 0),
        Number(item.quantity || 0),
        orderID,
        item.size ?? null
>>>>>>> origin/manager
      );
    }

    // Insert all order items at once
    await query(
      `
      INSERT INTO orderItem
        (orderItemID, menuID, priceAtPurchase, quantityPurchased, orderID, orderSize)
      VALUES
        ${valueStrings.join(", ")}
      `,
      params
    );
    for (const item of items) {
      const ingredientRows = await query(
        `
        SELECT inventoryID, menuInfoQuantity
        FROM menuInfo
        WHERE menuID = $1
        `,
        [item.menuID]
      );

      for (const ing of ingredientRows.rows) {
        const subtractAmount =
          Number(ing.menuinfoquantity) * Number(item.quantity || 0);

        await query(
          `
          UPDATE inventory
          SET quantityAvailable = quantityAvailable - $1
          WHERE inventoryID = $2
          `,
          [subtractAmount, ing.inventoryid]
        );
      }
    }

    // DONE
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