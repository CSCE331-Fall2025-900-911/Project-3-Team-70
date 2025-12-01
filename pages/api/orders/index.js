// pages/api/orders/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { query } from "../../../lib/db-connector";

export default async function handler(req, res) {
  if (req.method === "POST") {
    return handleCreateOrder(req, res);
  }

  if (req.method === "GET") {
    return handleListOrders(req, res);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

// POST /api/orders
async function handleCreateOrder(req, res) {
  const session = await getServerSession(req, res, authOptions);

  const {
    source = "kiosk",
    items = [],
    orderLocation = "Main Store",
    employeeID = null,
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "No items in order" });
  }

  const orderTotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.priceAtPurchase || 0) * Number(item.quantity || 0),
    0
  );

  const customerEmail = session?.user?.email || null;

  try {
    // Compute next orderID manually, to work with your INT PK
    const nextIdResult = await query(
      "SELECT COALESCE(MAX(orderID), 0) + 1 AS nextId FROM ordertest"
    );
    const nextOrderId = nextIdResult.rows[0].nextid;

    // Insert main order row
    await query(
      `
      INSERT INTO ordertest
        (orderID, employeeID, orderLocation, orderDate, orderTotal,
         orderComplete, customerEmail, orderSource)
      VALUES ($1, $2, $3, NOW(), $4, FALSE, $5, $6)
      `,
      [
        nextOrderId,
        employeeID,
        orderLocation,
        orderTotal,
        customerEmail,
        source,
      ]
    );

    // Insert line items
    const values = [];
    const params = [];
    let idx = 1;

    for (const item of items) {
      const price = Number(item.priceAtPurchase || 0);
      const qty = Number(item.quantity || 0);
      const size = item.size ?? null;

      values.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      params.push(item.menuID, price, qty, nextOrderId, size);
    }

    await query(
      `
      INSERT INTO orderItem
        (menuID, priceAtPurchase, quantityPurchased, orderID, orderSize)
      VALUES ${values.join(", ")}
      `,
      params
    );

    // Points are added later when the kitchen marks order complete
    return res.status(201).json({
      success: true,
      orderID: nextOrderId,
      orderTotal,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
}

// GET /api/orders?status=open|completed&source=kiosk|cashier
async function handleListOrders(req, res) {
  const { status = "open", source } = req.query;

  const where = [];
  const params = [];
  let idx = 1;

  if (status === "open") {
    where.push("ordertest.orderComplete = FALSE");
  } else if (status === "completed") {
    where.push("ordertest.orderComplete = TRUE");
  }

  if (source) {
    where.push(`ordertest.orderSource = $${idx++}`);
    params.push(source);
  }

  const whereSQL =
    where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const { rows } = await query(
      `
      SELECT
        orderID,
        employeeID,
        orderLocation,
        orderDate,
        orderTotal,
        orderComplete,
        customerEmail,
        orderSource
      FROM ordertest
      ${whereSQL}
      ORDER BY orderDate DESC
      `,
      params
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error("Error listing orders:", err);
    return res.status(500).json({ error: "Failed to load orders" });
  }
}
