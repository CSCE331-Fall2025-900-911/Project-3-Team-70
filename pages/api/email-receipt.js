// pages/api/email-receipt.js
import postmark from "postmark";
import { query } from "../../lib/db-connector.js";

const client = new postmark.ServerClient(
  process.env.POSTMARK_SERVER_TOKEN
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ error: `Method ${req.method} not allowed` });
  }

  const { orderId, email } = req.body || {};

  if (!orderId || !email) {
    return res
      .status(400)
      .json({ error: "Missing orderId or email" });
  }

  const numericId = parseInt(orderId, 10);
  if (Number.isNaN(numericId)) {
    return res.status(400).json({ error: "Invalid orderId" });
  }

  try {
    // === Query order + items from database ===
    const result = await query(
      `
      SELECT 
        o.orderid,
        o.orderdate,
        o.orderlocation,
        o.ordertotal,
        o.ordercomplete,
        oi.orderitemid,
        oi.menuid,
        oi.priceatpurchase,
        oi.quantitypurchased,
        oi.ordersize,
        m.menuname
      FROM ordertest o
      JOIN orderitem oi ON oi.orderid = o.orderid
      JOIN menu m       ON m.menuid = oi.menuid
      WHERE o.orderid = $1
      ORDER BY oi.orderitemid
      `,
      [numericId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const rows = result.rows;
    const first = rows[0];

    // === Format items ===
    const items = rows.map((r) => ({
      name: r.menuname,
      quantity: Number(r.quantitypurchased || 0),
      priceAtPurchase: Number(r.priceatpurchase || 0),
      size: r.ordersize || null,
    }));

    // === Compute total safely ===
    const orderTotal =
      first.ordertotal != null
        ? Number(first.ordertotal)
        : items.reduce(
            (sum, item) =>
              sum + item.priceAtPurchase * item.quantity,
            0
          );

    const orderDate = first.orderdate
      ? new Date(first.orderdate)
      : null;

    const orderDateText = orderDate
      ? `${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" }
        )}`
      : "Date unavailable";

    // === Build HTML items block ===
    const htmlItems = items
      .map((item) => {
        const lineTotal = (
          item.priceAtPurchase * item.quantity
        ).toFixed(2);
        return `
          <tr>
            <td style="padding: 6px 8px;">
              <div style="font-size: 16px; font-weight: 500;">${item.name}</div>
              ${
                item.size
                  ? `<div style="font-size: 12px; color: #777;">Size: ${item.size}</div>`
                  : ""
              }
              ${
                item.quantity > 1
                  ? `<div style="font-size: 12px; color: #777;">Qty: ${item.quantity}</div>`
                  : ""
              }
            </td>
            <td style="padding: 6px 8px; text-align: right; font-size: 16px;">
              $${lineTotal}
            </td>
          </tr>
        `;
      })
      .join("");

    // === Final HTML email ===
    const htmlBody = `
      <html>
        <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f0d7ff; padding: 24px;">
          <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); padding: 24px;">
            <h1 style="font-size: 24px; margin-bottom: 4px; text-align: center;">
              Sharetea Order Receipt
            </h1>
            <p style="font-size: 14px; text-align: center; margin: 0 0 16px; color: #555;">
              Order #${first.orderid} · ${orderDateText}
            </p>

            <div style="font-size: 14px; margin-bottom: 12px; color: #555;">
              <div>Location: <strong>${first.orderlocation ||
                "Kiosk"}</strong></div>
              <div>Status: <strong>${
                first.ordercomplete ? "Completed" : "In Progress"
              }</strong></div>
            </div>

            <table style="width: 100%; border-top: 1px dashed #ccc; padding-top: 8px; margin-top: 8px; border-collapse: collapse;">
              <tbody>
                ${htmlItems}
              </tbody>
            </table>

            <div style="border-top: 1px solid #000; margin-top: 14px; padding-top: 12px; display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
              <span>Total</span>
              <span>$${orderTotal.toFixed(2)}</span>
            </div>

            <p style="font-size: 12px; color: #777; margin-top: 18px; text-align: center;">
              Thank you for your order with Sharetea!
            </p>
          </div>
        </body>
      </html>
    `;

    // === Send email through Postmark ===
    await client.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL || "noreplyteam70boba@gmail.com",
      To: email,
      Subject: `Your Sharetea Receipt (Order #${first.orderid})`,
      HtmlBody: htmlBody,
      TextBody: `Your Sharetea order #${first.orderid} total is $${orderTotal.toFixed(
        2
      )}.`,
      MessageStream: "outbound",
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error sending receipt email:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
}
