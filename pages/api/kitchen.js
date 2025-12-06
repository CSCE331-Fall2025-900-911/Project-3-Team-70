// pages/api/kitchen.js
import { query } from "../../lib/db-connector.js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (
      !session?.user?.role ||
      !["employee", "manager"].includes(session.user.role)
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: kitchen is staff-only" });
    }

    if (req.method === "GET") {
      return handleGet(req, res);
    }

    if (req.method === "PATCH") {
      return handlePatch(req, res);
    }

    res.setHeader("Allow", ["GET", "PATCH"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error("Kitchen API error details:", err);
    return res.status(500).json({
      message: "Server error in kitchen API.",
      error: String(err),
    });
  }
}

async function handleGet(req, res) {
  const { type } = req.query;
  let where;

  if (type === "current") {
    where =
      "orderComplete = FALSE AND DATE(orderDate) = CURRENT_DATE";
  } else if (type === "completed") {
    where =
      "orderComplete = TRUE AND DATE(orderDate) = CURRENT_DATE";
  } else {
    return res
      .status(400)
      .json({ error: "Specify ?type=current or ?type=completed" });
  }

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
    WHERE ${where}
    ORDER BY orderDate DESC
    `
  );

  return res.status(200).json(rows);
}

async function handlePatch(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing order id" });
  }

  // Mark complete only if not already complete
  const updated = await query(
    `
    UPDATE ordertest
    SET orderComplete = TRUE
    WHERE orderID = $1
      AND orderComplete = FALSE
    RETURNING orderID, orderTotal, customerEmail
    `,
    [id]
  );

  if (updated.rowCount === 0) {
    return res.status(200).json({
      success: true,
      message: `Order ${id} was already complete.`,
    });
  }

  const row = updated.rows[0];
  const total = Number(row.ordertotal || 0);
  const email = row.customeremail;

  // Award points to the customer on completion
  if (email && total > 0) {
    const pointsToAdd = Math.floor(total); // 1 point per $1
    await query(
      `
      UPDATE app_users
      SET loyaltyPoints = loyaltyPoints + $1,
          loyaltyUpdatedAt = CURRENT_TIMESTAMP
      WHERE userEmail = $2
      `,
      [pointsToAdd, email]
    );
  }

  return res.status(200).json({
    success: true,
    message: `Order ${id} marked complete.`,
  });
}
