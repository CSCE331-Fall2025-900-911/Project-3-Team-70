// pages/cashier.js
import { useState, useEffect } from "react";
import Link from "next/link";
import { getSession } from "next-auth/react";

// 🔐 Protect cashier: employee OR manager
export async function getServerSideProps(ctx) {
  const session = await getSession(ctx);

  if (
    !session ||
    (session.user.role !== "employee" && session.user.role !== "manager")
  ) {
    return {
      redirect: { destination: "/unauthorized", permanent: false },
    };
  }

  return { props: {} };
}

export default function CashierPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [order, setOrder] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modifier state
  const [showModifier, setShowModifier] = useState(false);
  const [modTarget, setModTarget] = useState(null);
  const [modToppings, setModToppings] = useState([]);
  const [toppingOptions, setToppingOptions] = useState([]);

  // Fetch and normalize menu data from API
  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch("/api/menu");
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();

        const normalized = data.map((row) => {
          const id = row.menuid ?? row.menuID ?? row.id;
          return {
            id,
            name:
              row.menuname ??
              row.menuName ??
              row.name ??
              "Unnamed item",
            description:
              row.menudescription ??
              row.menuDescription ??
              row.description ??
              "",
            category: row.category ?? "Uncategorized",
            price: Number(row.price ?? 0),
            image: id ? `/images/${id}.png` : "/images/default.png",
          };
        });

        setMenuItems(normalized);
      } catch (err) {
        console.error("Error fetching menu:", err);
        setError("Failed to load menu.");
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  // Fetch toppings/ingredients from DB
  useEffect(() => {
    async function fetchToppings() {
      try {
        const res = await fetch("/api/modifiers");
        if (!res.ok) throw new Error("Failed to load modifiers");
        const data = await res.json();
        setToppingOptions(data.toppings || []);
      } catch (err) {
        console.error("Error fetching modifiers:", err);
      }
    }
    fetchToppings();
  }, []);

  // Filtering logic (case-safe)
  const filteredMenu = menuItems.filter((item) => {
    const name = (item.name || "").toLowerCase();
    const cat = (item.category || "").toLowerCase();
    const q = (query || "").toLowerCase();
    const filterLower = (filter || "").toLowerCase();

    const matchCat =
      filter === "all" ||
      cat === filterLower ||
      cat.includes(filterLower);
    const matchQuery = !q || name.includes(q);

    return matchCat && matchQuery;
  });

  // Add to order (takes modifications into account)
  const addToOrder = (item) => {
    setOrder((prev) => {
      const existing = prev.find(
        (x) =>
          x.id === item.id &&
          JSON.stringify(x.modifications || {}) ===
            JSON.stringify(item.modifications || {})
      );

      if (existing) {
        return prev.map((x) =>
          x.id === item.id &&
          JSON.stringify(x.modifications || {}) ===
            JSON.stringify(item.modifications || {})
            ? { ...x, qty: x.qty + 1 }
            : x
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const submitOrder = async () => {
    if (order.length === 0) {
      alert("No items in the order.");
      return;
    }

    try {
      const items = order.map((i) => ({
        menuID: i.id, // using normalized id
        quantity: i.qty,
        priceAtPurchase: Number(i.price || 0),
        modifications: i.modifications || null,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "cashier",
          orderLocation: "Front Counter",
          items,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit order");
      }

      setOrder([]);
      alert("Order submitted!");
    } catch (err) {
      console.error("Error submitting order:", err);
      alert("There was a problem submitting the order.");
    }
  };

  const removeItem = () => setOrder((prev) => prev.slice(0, -1));

  const total = order
    .reduce((acc, i) => acc + Number(i.price || 0) * i.qty, 0)
    .toFixed(2);

  // When user clicks "Add" on a menu item
  const handleOpenModifier = (item) => {
    setModTarget(item);
    setModToppings([]);
    setShowModifier(true);
  };

  // When user confirms in modal
  const handleConfirmModifier = () => {
    if (!modTarget) {
      setShowModifier(false);
      return;
    }
    const modifications = { toppings: modToppings };
    addToOrder({
      ...modTarget,
      modifications,
    });
    setShowModifier(false);
  };

  return (
    <div className="cashier-root">
      <header className="cashier-topbar">
        <div className="cashier-title">Boba POS System — Cashier View</div>
        <div className="cashier-actions">
          <Link href="/">
            <button className="btn ghost">Back</button>
          </Link>
        </div>
      </header>

      <main className="cashier-wrap">
        {/* LEFT: MENU */}
        <section className="panel">
          <div className="menu-header">
            <input
              type="search"
              placeholder="Search menu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search"
            />
            <div className="category-tabs">
              {[
                "all",
                "Ice-Blended",
                "Fruity Beverage",
                "Fresh Brew",
                "Milky Series",
                "Non-Caffeinated",
              ].map((cat) => (
                <button
                  key={cat}
                  className={`tab ${
                    filter === cat ? "active" : ""
                  }`}
                  onClick={() => setFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-scroll">
            {loading ? (
              <p>Loading menu…</p>
            ) : error ? (
              <p style={{ color: "red" }}>{error}</p>
            ) : (
              <div className="menu-grid">
                {filteredMenu.map((item) => (
                  <div key={item.id} className="menu-card">
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(e) => {
                        e.target.src = "/images/default.png";
                      }}
                    />
                    <div className="title">{item.name}</div>
                    <div className="desc">{item.description}</div>
                    <div className="row">
                      <div className="price">
                        ${Number(item.price || 0).toFixed(2)}
                      </div>
                      <button
                        className="btn primary"
                        onClick={() => handleOpenModifier(item)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: ORDER */}
        <aside className="panel">
          <div className="order-header">
            <h2>Current Order</h2>
            <button className="btn danger" onClick={removeItem}>
              Remove Item
            </button>
          </div>
          <div className="order-list">
            {order.length === 0 ? (
              <p style={{ padding: "8px 0" }}>No items yet.</p>
            ) : (
              order.map((line, idx) => (
                <div
                  key={line.id + "_" + idx}
                  className="order-item"
                >
                  <div className="name">
                    {line.name}
                    {line.modifications?.toppings &&
                      line.modifications.toppings.length > 0 && (
                        <div className="mods">
                          Toppings:{" "}
                          {line.modifications.toppings.join(", ")}
                        </div>
                      )}
                  </div>
                  <div className="qty">x{line.qty}</div>
                  <div className="subtotal">
                    $
                    {(
                      Number(line.price || 0) * line.qty
                    ).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="order-footer">
            <div className="total">Total: ${total}</div>
            <button className="btn success" onClick={submitOrder}>
              Submit Order
            </button>
          </div>
        </aside>
      </main>

      {/* MODIFIER POPUP */}
      {showModifier && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Customize {modTarget?.name}</h2>

            <div className="mod-section">
              <p>Select ingredients / toppings:</p>
              {toppingOptions.length === 0 ? (
                <p className="mods-empty">
                  No ingredients configured in inventory.
                </p>
              ) : (
                toppingOptions.map((t) => (
                  <label key={t} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={modToppings.includes(t)}
                      onChange={(e) => {
                        setModToppings((prev) => {
                          if (e.target.checked) {
                            return [...prev, t];
                          }
                          return prev.filter((x) => x !== t);
                        });
                      }}
                    />
                    {t}
                  </label>
                ))
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn danger"
                onClick={() => setShowModifier(false)}
              >
                Cancel
              </button>
              <button
                className="btn success"
                onClick={handleConfirmModifier}
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE + MODAL STYLES */}
      <style jsx>{`
        :root {
          --bg: #f7f7fb;
          --panel: #ffffff;
          --ink: #1f2937;
          --muted: #6b7280;
          --brand: #4f46e5;
          --brand-2: #22c55e;
          --border: #e5e7eb;
          --danger: #ef4444;
          --radius: 16px;
        }
        * {
          box-sizing: border-box;
        }
        body,
        html,
        .cashier-root {
          height: 100%;
          margin: 0;
          background: var(--bg);
          font-family: system-ui, sans-serif;
        }
        .cashier-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--panel);
          border-bottom: 1px solid var(--border);
        }
        .cashier-title {
          font-weight: 700;
        }
        .cashier-wrap {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
          height: calc(100vh - 60px);
          padding: 16px;
        }
        .panel {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .menu-header {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 12px;
          border-bottom: 1px solid var(--border);
        }
        .search {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 10px;
        }
        .category-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tab {
          padding: 6px 10px;
          border-radius: 999px;
          background: #f3f4f6;
          border: 1px solid var(--border);
          cursor: pointer;
          font-size: 13px;
        }
        .tab.active {
          background: #eef2ff;
          border-color: #c7d2fe;
          color: #3730a3;
        }
        .menu-scroll {
          overflow: auto;
          padding: 14px;
        }
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(180px, 1fr)
          );
          gap: 14px;
        }
        .menu-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #fafafa;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .menu-card img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .menu-card .title {
          font-weight: 600;
          font-size: 15px;
        }
        .menu-card .desc {
          font-size: 13px;
          color: var(--muted);
        }
        .menu-card .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }
        .btn {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 600;
          background: #f3f4f6;
          color: #111827;
        }
        .btn.primary {
          background: #500000;
          color: #ffffff;
          border-color: transparent;
        }
        .btn.success {
          background: #16a34a;
          color: white;
          border-color: transparent;
        }
        .btn.danger {
          background: #b91c1c;
          color: white;
          border-color: transparent;
        }
        .btn.ghost {
          background: transparent;
          color: #374151;
          border-color: #d1d5db;
        }
        .order-header,
        .order-footer {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
        }
        .order-footer {
          border-top: 1px solid var(--border);
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .order-list {
          overflow: auto;
          padding: 8px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .order-item {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 10px;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: center;
          background: #fff;
        }
        .order-item .name {
          font-size: 14px;
        }
        .order-item .qty {
          font-size: 14px;
          color: var(--muted);
        }
        .order-item .subtotal {
          font-weight: 600;
          font-size: 14px;
        }
        .mods {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
        }
        .total {
          font-weight: 800;
        }
        /* Modal styles */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
        }
        .modal {
          background: #ffffff;
          padding: 20px;
          border-radius: 14px;
          width: 360px;
          max-width: 95vw;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
        }
        .mod-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 260px;
          overflow: auto;
        }
        .mods-empty {
          font-size: 13px;
          color: #6b7280;
        }
        .checkbox-row {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 14px;
        }
        .modal-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}

