// pages/api/kitchen.js
import { query } from '../../lib/db-connector.js'; // ✅ use the named export from your connector

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { type } = req.query;
      let sql = '';

      if (type === 'current') {
        sql = `
          SELECT orderid, employeeid, ordertotal, orderdate
          FROM ordertest
          WHERE ordercomplete = false
          ORDER BY orderdate DESC;
        `;
      } else if (type === 'completed') {
        sql = `
          SELECT orderid, employeeid, ordertotal, orderdate
          FROM ordertest
          WHERE ordercomplete = true
            AND DATE(orderdate) = CURRENT_DATE
          ORDER BY orderdate DESC;
        `;
      } else {
        return res.status(400).json({ error: "Specify ?type=current or ?type=completed" });
      }

      const { rows } = await query(sql);
      return res.status(200).json(rows);
    }

    if (req.method === 'PATCH') {
      const { id } = req.query;
      await query(`UPDATE ordertest SET orderComplete = true WHERE orderid = $1`, [id]);
      return res.status(200).json({ success: true, message: `Order ${id} marked complete.` });
    }

    res.setHeader('Allow', ['GET', 'PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
        console.error('Kitchen API error details:', err); // will show full object in terminal
        res.status(500).json({
            message: 'Server error in kitchen API.',
            error: String(err)  // <- forces it to stringify, even if message is weird
        });
    }
}

