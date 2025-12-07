import { query } from '../../lib/db-connector';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderID } = req.query;

  if (!orderID) {
    return res.status(400).json({ error: 'Missing orderID parameter' });
  }

  try {
    // Step 1: Get all order items for this order
    const orderItemsResult = await query(
      `
      SELECT oi.orderItemID, oi.menuID, oi.priceAtPurchase, oi.quantityPurchased, oi.orderSize, m.menuName
      FROM orderItem oi
      JOIN menu m ON oi.menuID = m.menuID
      WHERE oi.orderID = $1
      `,
      [orderID]
    );

    const orderItems = orderItemsResult.rows;

    // Step 2: Get modifications for these order items
    const orderItemIDs = orderItems.map(item => item.orderitemid);
    let modifications = [];

    if (orderItemIDs.length > 0) {
      const modsResult = await query(
        `
        SELECT modificationID, inventoryID, orderItemID, modificationQuantity, cost, i.inventoryName
        FROM modification
        JOIN inventory i ON modification.inventoryID = i.inventoryID
        WHERE orderItemID = ANY($1)
        `,
        [orderItemIDs]
      );

      modifications = modsResult.rows;
    }

    // Step 3: Combine items with their modifications
    const billItems = orderItems.map(item => {
      const itemMods = modifications
        .filter(mod => mod.orderitemid === item.orderitemid)
        .map(mod => ({
          modificationID: mod.modificationid,
          name: mod.inventoryname,
          quantity: mod.modificationquantity,
          cost: parseFloat(mod.cost),
        }));

      const modificationsTotal = itemMods.reduce((sum, mod) => sum + mod.cost, 0);

      return {
        orderItemID: item.orderitemid,
        name: item.menuname,
        quantity: parseFloat(item.quantitypurchased),
        size: item.ordersize,
        pricePerItem: parseFloat(item.priceatpurchase),
        modifications: itemMods,
        totalPrice: parseFloat(item.priceatpurchase) * parseFloat(item.quantitypurchased) + modificationsTotal,
      };
    });

    res.status(200).json({
      orderID,
      items: billItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate bill' });
  }
}
