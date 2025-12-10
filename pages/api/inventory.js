// pages/api/inventory.js
import { query } from "../../lib/db-connector.js";

export default async function handler(req, res) {
    try {
        if (req.method === "GET") {
            const { rows } = await query(
                `
                SELECT
                    inventoryID,
                    inventoryName,
                    quantityAvailable,
                    restockMin,
                    restockOrdered,
                    unit,
                    allergy
                FROM inventory
                ORDER BY inventoryName;
                `
            );
        
            return res.status(200).json(rows);
        }

        if (req.method === "POST") {
            const { name, quantity, restockMin, unit, allergy, isTopping } = req.body;

            const next = await query(
                `SELECT COALESCE(MAX(inventoryID), 0) + 1 AS id FROM inventory`
            );
            const newID = next.rows[0].id;

            const result = await query(
                `
              INSERT INTO inventory (
                  inventoryID, 
                  inventoryName, 
                  quantityAvailable,
                  restockPrice,
                  addOnPrice,
                  restockOrdered,
                  unit,
                  allergy,
                  restockMin,
                  isTopping
              )
              VALUES ($1,$2,$3,0,0,0,$4,$5,$6,$7)
              RETURNING *;
                `,
                [newID, name, quantity ?? 0, unit, allergy ?? null, restockMin ?? 0, isTopping ?? false]
            );

            return res.status(201).json(result.rows[0]);
        }

        if (req.method === "PUT") {
            const { id, name, quantity, restockMin, unit, allergy, restockOrdered } = req.body;
                
            const result = await query(
                `
            UPDATE inventory
            SET
                inventoryName = $1,
                quantityAvailable = $2,
                restockMin = $3,
                unit = $4,
                allergy = $5,
                restockOrdered = $6,
                isTopping = $7
            WHERE inventoryID = $8
                RETURNING *;
                `,
                [name, quantity, restockMin, unit, allergy, restockOrdered, id]
            );
        
            return res.status(200).json(result.rows[0]);
        }

        if (req.method === "PATCH") {
            const { id, amount } = req.body;

            const result = await query(
                `
                UPDATE inventory
                SET 
                    quantityAvailable = quantityAvailable + $1,
                    restockOrdered = restockOrdered - $1
                WHERE inventoryID = $2
                RETURNING *;
                `,
                [amount, id]
            );
        
            return res.status(200).json(result.rows[0]);
        }

        res.setHeader("Allow", ["GET", "POST", "PUT"]);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

    } catch (err) {
        console.error("Inventory API ERROR:", err);
        return res.status(500).json({ error: "Server Error" });
    }
}