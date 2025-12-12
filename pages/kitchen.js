// pages/kitchen.js
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSession } from "next-auth/react";

// Protect kitchen: employee OR manager
export async function getServerSideProps(ctx) {
  const session = await getSession(ctx);

  if (
    !session ||
    (session.user.role !== "employee" &&
      session.user.role !== "manager")
  ) {
    return {
      redirect: { destination: "/unauthorized", permanent: false },
    };
  }

  return { props: {} };
}

export default function KitchenPage() {
  const [tab, setTab] = useState("current");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = async (type) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/kitchen?type=${type}`);
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
      setError("Error loading orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(tab);
  }, [tab]);

  const markComplete = async (orderId) => {
    try {
      const res = await fetch(`/api/kitchen?id=${orderId}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to update order");
      await loadOrders("current");
    } catch (err) {
      console.error(err);
      alert("Could not mark order complete.");
    }
  };

  return (
    <div className="kitchen-root">
      <header className="kitchen-topbar">
        <div className="title">Kitchen View</div>
        <div className="actions">
          <Link href="/">
            <button className="btn ghost">Home</button>
          </Link>
        </div>
      </header>

      <main className="kitchen-main">
        <div className="tabs">
          <button
            className={`tab ${tab === "current" ? "active" : ""}`}
            onClick={() => setTab("current")}
          >
            Open Orders
          </button>
          <button
            className={`tab ${tab === "completed" ? "active" : ""}`}
            onClick={() => setTab("completed")}
          >
            Completed Today
          </button>
        </div>

        {loading && <p>Loading orders…</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {!loading && !error && (
          <div className="orders-grid">
            {orders.length === 0 && (
              <p>No orders in this view right now.</p>
            )}

        {orders.map((o) => {
          // --- Recompute total from items + modifiers ---

          return (
            <div key={o.orderid} className="order-card">
              <div className="order-header">
                <span className="order-id">Order #{o.orderid}</span>
                <span className="source-tag">
                  {o.ordersource === "cashier" ? "Cashier" : "Kiosk"}
                </span>
              </div>

              <div className="order-body">
                <p>
                  <strong>Total:</strong> ${Number(o.ordertotal).toFixed(2)}
                </p>
                <p>
                  <strong>Placed:</strong>{" "}
                  {new Date(o.orderdate).toLocaleTimeString()}
                </p>

                {o.customeremail && (
                  <p>
                    <strong>Customer:</strong> {o.customeremail}
                  </p>
                )}
                {o.employeeid && (
                  <p>
                    <strong>Employee ID:</strong> {o.employeeid}
                  </p>
                )}

                {/* ---------- ORDER ITEMS ---------- */}
                <div className="order-items">
                  <strong>Items:</strong>

                  {o.items && o.items.length > 0 ? (
                    o.items.map((item, idx) => (
                      <div className="order-line" key={idx}>
                        {/* Base item */}
                        <div className="line-main">
                          <span className="line-name">{item.menuname}</span>
                          <span className="line-qty">x{item.quantitypurchased}</span>
                        </div>

                        {/* Size */}
                        {item.ordersize && (
                          <div className="line-mod">
                            Size: {{ 1: "Small", 2: "Medium", 3: "Large" }[item.ordersize]}
                          </div>
                        )}

                        {/* Modifications */}
                        {Array.isArray(item.modifications) && item.modifications.length > 0 && (
                          <div className="line-mod">
                            <strong>Add-ons:</strong>{" "}
                            {item.modifications.map((mod, i) => (
                              <span key={i}>
                                {mod.inventoryname}
                                {mod.modificationquantity ? ` x${mod.modificationquantity}` : ""}
                                {mod.cost ? ` ($${(mod.cost * (mod.modificationquantity || 1)).toFixed(2)})` : ""}
                                {i < item.modifications.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Line total (base only, like before) */}
                        <div className="line-price">
                          ${(
                            Number(item.priceatpurchase || 0) *
                            Number(item.quantitypurchased || 0)
                          ).toFixed(2)}
                        </div>

                        <hr />
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: "13px", opacity: 0.6 }}>
                      (No item details available)
                    </p>
                  )}
                </div>
              </div>

              {tab === "current" && (
                <button
                  className="btn complete"
                  onClick={() => markComplete(o.orderid)}
                >
                  Mark Complete
                </button>
              )}
            </div>
          );
        })}
          </div>
        )}
      </main>

      <style jsx>{`
        .kitchen-root {
          min-height: 100vh;
          background: #f7f7fb;
          color: #1f2937;
          display: flex;
          flex-direction: column;
        }
        .kitchen-topbar {
          height: 60px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #500000;
          color: #fff;
        }
        .title {
          font-weight: 700;
        }
        .btn {
          border-radius: 999px;
          padding: 6px 16px;
          border: none;
          cursor: pointer;
          font-weight: 600;
        }
        .btn.ghost {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .btn.complete {
          background: #16a34a;
          color: #fff;
          width: 100%;
          margin-top: 8px;
        }
        .kitchen-main {
          padding: 16px;
          flex: 1;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .tab {
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          background: #fff;
          cursor: pointer;
          font-size: 14px;
        }
        .tab.active {
          background: #500000;
          color: #fff;
          border-color: #500000;
        }
        .orders-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(260px, 1fr)
          );
          gap: 12px;
          margin-top: 8px;
        }
        .order-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }
        .order-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .order-id {
          font-weight: 700;
        }
        .source-tag {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 999px;
          background: #fee2e2;
          color: #991b1b;
        }
          .order-items {
            margin-top: 8px;
            font-size: 14px;
          }

          .order-line {
            padding: 6px 0;
          }

          .line-main {
            display: flex;
            justify-content: space-between;
          }

          .line-name {
            font-weight: 600;
          }

          .line-qty {
            font-weight: 600;
          }

          .line-mod {
            font-size: 13px;
            margin-left: 6px;
            opacity: 0.8;
          }

          .line-price {
            font-size: 13px;
            font-weight: 700;
            margin-top: 2px;
          }
        .order-body p {
          margin: 2px 0;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}