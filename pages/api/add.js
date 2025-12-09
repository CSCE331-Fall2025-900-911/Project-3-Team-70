// pages/api/menu/add.js
import { query } from "../../lib/db-connector.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const {
            name,
            category,
            price,
            description,
            allYear,
            startDate,      // "YYYY-MM-DD" or null
            endDate,        // "YYYY-MM-DD" or null
            ingredients     // [{ inventoryID, quantity }]
        } = req.body || {};

        // Basic validation
        if (!name || !category || price === undefined || price === null) {
            return res.status(400).json({ error: "Name, category, and price are required." });
        }

        if (!Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ error: "At least one ingredient is required." });
        }

        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({ error: "Price must be a positive number." });
        }

        // Seasonal timestamps
        let seasonalStartTs;
        let seasonalEndTs;

        if (allYear || (!startDate && !endDate)) {
            // Your requested default for year-round items
            seasonalStartTs = "2025-01-01 00:00:00";
            seasonalEndTs = "2025-12-31 23:59:59";
        } else {
            if (!startDate || !endDate) {
                return res.status(400).json({
                    error: "Both seasonal start and end dates are required, or use All Year."
                });
            }
            seasonalStartTs = `${startDate} 00:00:00`;
            seasonalEndTs = `${endDate} 23:59:59`;
        }

        // 1) Get next menuID
        const menuIdResult = await query(
            `SELECT COALESCE(MAX(menuID) + 1, 0) AS nextid FROM menu;`,
            []
        );
        const newMenuID = menuIdResult.rows[0].nextid;

        // 2) Get next menuImage (auto-increment image number)
        const imgResult = await query(
            `SELECT COALESCE(MAX(menuImage) + 1, 0) AS nextimage FROM menu;`,
            []
        );
        const newMenuImage = imgResult.rows[0].nextimage;

        // 3) Insert into menu
        await query(
            `
            INSERT INTO menu (
                menuID,
                menuName,
                category,
                price,
                menuImage,
                menuDescription,
                seasonalStart,
                seasonalEnd
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            `,
            [
                newMenuID,
                name,
                category,
                numericPrice,
                newMenuImage,
                description || "",
                seasonalStartTs,
                seasonalEndTs
            ]
        );

        // 4) Get starting menuInfoID
        const menuInfoIdResult = await query(
            `SELECT COALESCE(MAX(menuInfoID) + 1, 1) AS nextid FROM menuInfo;`,
            []
        );
        let nextMenuInfoID = menuInfoIdResult.rows[0].nextid;

        // 5) Insert ingredients into menuInfo (no transaction, but sufficient for project)
        for (const ing of ingredients) {
            const invId = Number(ing.inventoryID);
            const qty = Number(ing.quantity);

            if (!invId || isNaN(qty) || qty <= 0) {
                continue; // skip invalid ingredient
            }

            await query(
                `
                INSERT INTO menuInfo (
                    menuInfoID,
                    inventoryID,
                    menuID,
                    menuInfoQuantity
                )
                VALUES ($1, $2, $3, $4);
                `,
                [nextMenuInfoID, invId, newMenuID, qty]
            );

            nextMenuInfoID += 1;
        }

        return res.status(201).json({
            success: true,
            menuID: newMenuID,
            menuImage: newMenuImage
        });
    } catch (err) {
        console.error("Error in /api/menu/add:", err);
        return res.status(500).json({ error: "Failed to add menu item." });
    }
}
