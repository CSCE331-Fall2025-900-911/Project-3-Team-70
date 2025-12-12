// pages/api/sales.js
import { query } from '../../lib/db-connector.js';

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { start, end } = req.query;
  const useRange = start && end;

  try {

  const summarySQL = useRange
    ? `
      SELECT 
        COALESCE(SUM(
                  CASE
                    WHEN orderTotal IS NULL THEN 0
                    WHEN orderTotal::text = 'NaN' THEN 0
                    ELSE orderTotal
                  END
                ), 0) AS totalSales,
        COUNT(orderID) AS totalOrders,
        MIN(orderDate) AS firstOrder,
        MAX(orderDate) AS lastOrder
      FROM ordertest
      WHERE orderTotal = orderTotal
        AND orderDate >= $1
        AND orderDate < $2;
    `
    : `
      SELECT 
        COALESCE(SUM(
  CASE
    WHEN orderTotal IS NULL THEN 0
    WHEN orderTotal::text = 'NaN' THEN 0
    ELSE orderTotal
  END
    ), 0) AS totalSales,
        COUNT(orderID) AS totalOrders,
        MIN(orderDate) AS firstOrder,
        MAX(orderDate) AS lastOrder
      FROM ordertest
      WHERE orderTotal = orderTotal;
    `;

    const summary = (
      await query(summarySQL, useRange ? [start, end] : [])
    ).rows[0];


  const hourlySQL = useRange
    ? `
      SELECT 
        EXTRACT(HOUR FROM orderDate) AS hour,
        SUM(
  CASE
    WHEN orderTotal IS NULL THEN 0
    WHEN orderTotal::text = 'NaN' THEN 0
    ELSE orderTotal
  END
) AS totalSales
      FROM ordertest
      WHERE orderTotal = orderTotal
        AND orderDate >= $1
        AND orderDate < $2
      GROUP BY hour
      ORDER BY hour;
    `
    : `
      SELECT 
        EXTRACT(HOUR FROM orderDate) AS hour,
        SUM(
  CASE
    WHEN orderTotal IS NULL THEN 0
    WHEN orderTotal::text = 'NaN' THEN 0
    ELSE orderTotal
  END
) AS totalSales
      FROM ordertest
      WHERE orderTotal = orderTotal
      GROUP BY hour
      ORDER BY hour;
    `;
    const hourly = (
      await query(hourlySQL, useRange ? [start, end] : [])
    ).rows;


    const ordersSQL = useRange
      ? `
        SELECT 
          orderID,
          employeeID,
          orderLocation,
          orderDate,
          orderTotal
        FROM ordertest
        WHERE orderDate >= $1 AND orderDate < $2 AND orderTotal = orderTotal
        ORDER BY orderDate DESC
        LIMIT 200;
      `
      : `
        SELECT 
          orderID,
          employeeID,
          orderLocation,
          orderDate,
          orderTotal
        FROM ordertest
        ORDER BY orderDate DESC
        LIMIT 200;
      `;

    const orders = (
      await query(ordersSQL, useRange ? [start, end] : [])
    ).rows;

    return res.status(200).json({
      summary,
      hourly,
      orders,
      usedRange: useRange,
    });
  } catch (err) {
    console.error("Error in /api/sales:", err);
    return res.status(500).json({ error: "Database error" });
  }
}
