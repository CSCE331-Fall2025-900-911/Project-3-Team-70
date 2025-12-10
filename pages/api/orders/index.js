// pages/api/orders/index.js
import { query } from "../../../lib/db-connector.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ error: `Method ${req.method} Not Allowed` });
  }
  return handleCreateOrder(req, res);
}

// map kiosk size string -> DB integer code (adjust if needed)
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
      return null;
  }
}

async function handleCreateOrder(req, res) {
  try {
    const {
      source = "kiosk",
      orderLocation = "Kiosk",
      customerEmail = null,
      employeeID = null,
      items = [],
      orderSubtotal,
      taxAmount,
      discountAmount,
      finalTotal,
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in order" });
    }

    // Normalize items & toppings
    const normalizedItems = items.map((item) => {
      const menuID = item.menuID ?? item.menuid ?? item.id;
      const quantity = Number(item.quantity || 1);
      const priceAtPurchase = Number(
        item.priceAtPurchase ??
          item.finalPrice ??
          item.price ??
          0
      );
      const sizeInt = mapSizeToInt(item.size);

      const toppings = Array.isArray(item.toppings)
        ? item.toppings.map((t) => ({
            inventoryID: t.inventoryID ?? t.id,
            quantity: Number(t.quantity || 1),
            price: Number(t.price || 0),
          }))
        : [];

      return {
        menuID,
        quantity,
        priceAtPurchase,
        sizeInt,
        toppings,
      };
    });

    const computedSubtotal = normalizedItems.reduce(
      (sum, it) => sum + it.priceAtPurchase * it.quantity,
      0
    );

    const subtotal = orderSubtotal ?? computedSubtotal;
    const discount = discountAmount ?? 0;
    const tax =
      taxAmount ??
      Number(((subtotal - discount) * 0.0625).toFixed(2));
    const total =
      finalTotal ??
      Number((subtotal - discount + tax).toFixed(2));

    // 1) Insert into ordertest and let DB choose orderID
    const orderInsert = await query(
      `
      INSERT INTO ordertest
        (employeeID, orderLocation, orderDate, orderTotal, orderComplete, customerEmail, orderSource)
      VALUES
        ($1, $2, NOW(), $3, FALSE, $4, $5)
      RETURNING orderID
      `,
      [employeeID, orderLocation, total, customerEmail, source]
    );
    const orderID = orderInsert.rows[0].orderid;

    // 2) Insert each item into orderitem and track orderItemID
    const itemsWithOrderItemIds = [];

    for (const it of normalizedItems) {
      if (it.menuID == null) continue;

      const itemInsert = await query(
        `
        INSERT INTO orderitem
          (orderID, menuID, priceAtPurchase, quantityPurchased, orderSize)
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING orderItemID
        `,
        [
          orderID,
          it.menuID,
          it.priceAtPurchase,
          it.quantity,
          it.sizeInt,
        ]
      );
      const orderItemID = itemInsert.rows[0].orderitemid;

      itemsWithOrderItemIds.push({ orderItemID, item: it });
    }

    // 3) Insert modifications for toppings
    for (const { orderItemID, item } of itemsWithOrderItemIds) {
      for (const top of item.toppings) {
        if (!top.inventoryID || top.quantity <= 0) continue;

        await query(
          `
          INSERT INTO modification
            (inventoryID, orderItemID, modificationQuantity, cost)
          VALUES
            ($1, $2, $3, $4)
          `,
          [
            top.inventoryID,
            orderItemID,
            top.quantity,
            top.price,
          ]
        );
      }
    }

    // 4) Update inventory based on base recipe
    for (const it of normalizedItems) {
      if (it.menuID == null) continue;

      const ingredientRows = await query(
        `
        SELECT inventoryID, menuInfoQuantity
        FROM menuInfo
        WHERE menuID = $1
        `,
        [it.menuID]
      );

      for (const ing of ingredientRows.rows) {
        const subtractAmount =
          Number(ing.menuinfoquantity) * Number(it.quantity);

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

    return res.status(201).json({
      success: true,
      orderID,
      orderTotal: total,
      subtotal,
      discount,
      tax,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({
      error: "Failed to create order",
      details: String(err.message || err),
    });
  }
}
