import { query } from '../../lib/db-connector.js';


export default async function handler(req, res) {
try {
const result = await query(`
SELECT menuID, menuName, category, price, menuImage, menuDescription, seasonalStart, seasonalEnd
FROM menu;
`);
res.status(200).json(result.rows);
} catch (err) {
console.error('Database error:', err);
res.status(500).json({ error: 'Failed to load menu data.' });
}
}