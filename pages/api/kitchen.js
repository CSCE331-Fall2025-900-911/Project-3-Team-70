// pages/api/kitchen.js
import pool from '../../lib/db-connector.js';

export default async function handler(req, res) {
  try {
    // === GET === //
    if (req.method === 'GET') {
      const { type } = req.query;

      // Placeholder SQL queries — adjust field names later
      let query = '';

      if (type === 'current') {
        // Fetch all "in-progress" orders
        query = `
          SELECT orderID, employeeID, orderTotal, orderDate
          FROM ordertest
          WHERE orderStatus = 'In Progress'
          ORDER BY orderDate DESC;
        `;
      } else if (type === 'completed') {
        // Fetch all "completed" orders for today
        query = `
          SELECT orderID, employeeID, orderTotal, orderDate
          FROM ordertest
          WHERE orderStatus = 'Completed'
            AND DATE(orderDate) = CURRENT_DATE
          ORDER BY orderDate DESC;
        `;
      } else {
        return res.status(400).json({ error: "Specify ?type=current or ?type=completed" });
      }

      // Placeholder DB call
      // const { rows } = await pool.query(query);

      // For now, send fake data
      const rows = [
        { id: 101, employee: "Brenden", total: 22.50, time: "3:41 PM" },
        { id: 102, employee: "Ryan", total: 18.25, time: "3:52 PM" }
        ];


      return res.status(200).json(rows);
    }

    // === PATCH === //
    if (req.method === 'PATCH') {
      const { id } = req.query;
      // Placeholder query
      // await pool.query('UPDATE ordertest SET orderStatus = $1 WHERE orderID = $2', ['Completed', id]);
      return res.status(200).json({ success: true, message: `Order ${id} marked complete (placeholder).` });
    }

    res.setHeader('Allow', ['GET', 'PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('Kitchen API error:', err);
    res.status(500).json({ message: 'Server error in kitchen API.' });
  }
}
