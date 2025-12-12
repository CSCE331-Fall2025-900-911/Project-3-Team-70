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
      employeeID = null,
      customerEmail = null,
      finalTotal,
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in order" });
    }

    // Compute order total
    // Compute total from base item price + modifications, identical to Kitchen logic
    const orderTotal = Number(finalTotal);

    const nextOrderResult = await query(
      "SELECT COALESCE(MAX(orderID), 0) + 1 AS nextId FROM ordertest"
    );
    const orderID = Number(nextOrderResult.rows[0].nextid);

    // 2) Insert into ordertest
    await query(
      `
      INSERT INTO ordertest(
        orderID, employeeID, orderLocation, orderDate, orderTotal, orderComplete, orderSource)
      VALUES
        ($1, $2, $3, NOW(), $4, FALSE, $5)
      `,
      [orderID, employeeID, orderLocation, orderTotal, source]
    );

    // 3) Prepare orderItem insert
    const nextItemResult = await query(
      "SELECT COALESCE(MAX(orderItemID), 0) AS maxId FROM orderItem"
    );
    let nextOrderItemID = Number(nextItemResult.rows[0].maxid) + 1;

    const valueStrings = [];
    const params = [];

    for (const item of items) {
      valueStrings.push(
        `($${params.length + 1}, $${params.length + 2}, $${params.length + 3}, $${params.length + 4}, $${params.length + 5}, $${params.length + 6})`
      );

      params.push(
        nextOrderItemID++,                 
        item.menuID,
        Number(item.priceAtPurchase || 0),
        Number(item.quantity || 0),
        orderID,
        mapSizeToInt(item.size)
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

    // 4) Insert modifications for each item
    let insertedItemIndex = 0;

    for (const item of items) {
      // Compute the orderItemID generated earlier
      const orderItemID = (nextOrderItemID - items.length) + insertedItemIndex;
      insertedItemIndex++;
    
      if (item.modifications && item.modifications.length > 0) {
        for (const mod of item.modifications) {
          await query(
            `
            INSERT INTO modification
              (modificationID, inventoryID, orderItemID, modificationQuantity, cost)
            VALUES
              ((SELECT COALESCE(MAX(modificationID), 0) + 1 FROM modification),
               $1, $2, $3, $4)
            `,
            [
              mod.inventoryID,
              orderItemID,
              Number(mod.modificationQuantity || 1),
              Number(mod.cost || 0)
            ]
          );
        }
      }
    }
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
      orderTotal: Number(orderTotal),
    });

  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
}