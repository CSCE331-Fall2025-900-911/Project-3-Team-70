// pages/api/inventory.js
import { query } from "../../lib/db-connector.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
        const { rows } = await query(
            `
            SELECT
                inventoryID,
                inventoryName,
                quantityAvailable,
                restockMin,
                unit,
                allergy
            FROM inventory
            ORDER BY inventoryName;
            `
        );

        return res.status(200).json(rows);
    } catch (err) {
        console.error("Error fetching inventory:", err);
        return res.status(500).json({ error: "Failed to load inventory" });
    }
}
