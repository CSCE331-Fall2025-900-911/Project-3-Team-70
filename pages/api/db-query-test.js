import { query } from '../../lib/db-connector.js';

export default async function handler(req, res) {
  try {
    const result = await query('SELECT NOW()');
    res.status(200).json({ time: result.rows[0] });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
}