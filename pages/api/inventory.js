// pages/api/inventory.js
import { query } from "../../lib/db-connector.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const result = await query(
            `
            SELECT 
                inventoryID,
                inventoryName,
                unit,
                allergy
            FROM inventory
            ORDER BY inventoryName;
            `,
            []
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("Error in /api/inventory:", err);
        return res.status(500).json({ error: "Failed to load inventory." });
    }
}
