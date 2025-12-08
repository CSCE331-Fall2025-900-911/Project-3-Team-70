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

async function handleCreateOrder(req, res) {
  try {
    const {
      source = "kiosk",
      orderLocation = "Kiosk",
      items = [],
      employeeID = null,
      customerEmail = null
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in order" });
    }

    // === Compute Order Total ===
    const orderTotal = items.reduce(
      (sum, item) =>
        sum +
        Number(item.priceAtPurchase || 0) * Number(item.quantity || 0),
      0
    );

    // === Next Order ID ===
    const nextOrderResult = await query(
      "SELECT COALESCE(MAX(orderID), 0) + 1 AS nextId FROM ordertest"
    );
    const orderID = Number(nextOrderResult.rows[0].nextid);

    // === Insert into ordertest ===
    await query(
      `
      INSERT INTO ordertest
        (orderID, employeeID, orderLocation, orderDate, orderTotal, orderComplete)
      VALUES
        ($1, $2, $3, NOW(), $4, FALSE)
      `,
      [orderID, employeeID, orderLocation, orderTotal]
    );

    // === Next OrderItem ID ===
    const nextItemResult = await query(
      "SELECT COALESCE(MAX(orderItemID), 0) AS maxId FROM orderItem"
    );
    let nextOrderItemID = Number(nextItemResult.rows[0].maxid) + 1;

    const valueStrings = [];
    const params = [];

    for (const item of items) {
      valueStrings.push(
        `($${params.length + 1}, $${params.length + 2}, $${params.length + 3},
          $${params.length + 4}, $${params.length + 5}, $${params.length + 6})`
      );

      params.push(
        nextOrderItemID++,
        item.menuID || item.menuid,
        Number(item.priceAtPurchase || 0),
        Number(item.quantity || 0),
        orderID,
        item.size ?? null
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

    // =======================
    // EARN LOYALTY POINTS
    // =======================
    if (customerEmail) {
      const pointsToAdd = Math.floor(orderTotal / 10); // 1 point per $10 spent

      await query(
        `
        UPDATE app_users
        SET loyaltyPoints = loyaltyPoints + $1,
            loyaltyUpdatedAt = NOW()
        WHERE userEmail = $2
        `,
        [pointsToAdd, customerEmail]
      );
    }

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
