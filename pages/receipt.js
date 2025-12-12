// pages/receipt.js
import React from "react";
import { query } from "../lib/db-connector.js";

export async function getServerSideProps(context) {
  const { orderid } = context.query;
  const numericId = parseInt(orderid, 10);

  if (!orderid || Number.isNaN(numericId)) {
    return { notFound: true };
  }

  try {
    // Join ordertest + orderItem + menu to get receipt data
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
      return { notFound: true };
    }

    const rows = result.rows;
    const first = rows[0];

    const items = rows.map((r) => ({
      orderItemId: r.orderitemid,
      menuId: r.menuid,
      name: r.menuname,
      quantity: Number(r.quantitypurchased || 0),
      priceAtPurchase: Number(r.priceatpurchase || 0),
      size: r.ordersize || null,
    }));

    const orderTotal = Number(first.ordertotal);

    const order = {
      orderId: first.orderid,
      orderDate: first.orderdate ? first.orderdate.toString() : null,
      orderLocation: first.orderlocation || "Kiosk",
      orderComplete: first.ordercomplete,
      orderTotal,
    };

    return {
      props: {
        order,
        items,
      },
    };
  } catch (err) {
    console.error("Error fetching order for receipt:", err);
    return { notFound: true };
  }
}

export default function ReceiptPage({ order, items }) {
  if (!order) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p>Order not found.</p>
      </div>
    );
  }

  const orderDate = order.orderDate ? new Date(order.orderDate) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f0d7ff",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          width: "100%",
          backgroundColor: "#fff",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          padding: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            marginBottom: "4px",
            textAlign: "center",
          }}
        >
          Sharetea Order Receipt
        </h1>

        <p
          style={{
            fontSize: "14px",
            textAlign: "center",
            marginBottom: "16px",
            color: "#555",
          }}
        >
          Order #{order.orderId} ·{" "}
          {orderDate
            ? `${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString(
                [],
                { hour: "2-digit", minute: "2-digit" }
              )}`
            : "Date unavailable"}
        </p>

        <div
          style={{
            fontSize: "14px",
            marginBottom: "12px",
            color: "#555",
          }}
        >
          <div>
            Location: <strong>{order.orderLocation}</strong>
          </div>
          <div>
            Status:{" "}
            <strong>
              {order.orderComplete ? "Completed" : "In Progress"}
            </strong>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px dashed #ccc",
            paddingTop: "10px",
            marginTop: "10px",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {items.map((item) => (
            <div
              key={item.orderItemId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
                fontSize: "16px",
              }}
            >
              <div>
                <div>{item.name}</div>
                {item.size && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#777",
                    }}
                  >
                    Size: {item.size}
                  </div>
                )}
                {item.quantity > 1 && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#777",
                    }}
                  >
                    Qty: {item.quantity}
                  </div>
                )}
              </div>
              <div>
                ${(item.priceAtPurchase * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: "1px solid #000",
            marginTop: "12px",
            paddingTop: "12px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "18px",
            fontWeight: "bold",
          }}
        ></div>

        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
          }}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#500000",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
