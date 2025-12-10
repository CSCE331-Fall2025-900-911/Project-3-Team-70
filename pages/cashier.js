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

  // NEW — track which order line is selected
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modifier state
  const [showModifier, setShowModifier] = useState(false);
  const [modTarget, setModTarget] = useState(null);
  const [modToppings, setModToppings] = useState([]);
  const [toppingOptions, setToppingOptions] = useState([]);
  const [modSize, setModSize] = useState("Medium");
  const [modSweetness, setModSweetness] = useState("100%");
  const [modIce, setModIce] = useState("Regular Ice");
  const [modTemp, setModTemp] = useState("Cold");
  const [showSortModal, setShowSortModal] = useState(false);


  // Fetch and normalize menu data
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

  // Fetch toppings
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

  // Filter logic
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
  const categories = ["all", ...Array.from(new Set(menuItems.map(i => i.category)))].sort();

  // Add to order
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

      return [...prev, { ...item, qty: 1, price: item.price }];
    });

    // NEW — clear selected index (so removed doesn't mismatch)
    setSelectedIndex(null);
  };

  const submitOrder = async () => {
    if (order.length === 0) {
      alert("No items in the order.");
      return;
    }

    try {
      const items = order.map((i) => {
        // Convert toppings → kiosk format
        const toppingMods = (i.modifications?.toppings || []).map((t) => ({
          inventoryID: t.id,
          name: t.name,
          cost: 1.0,
          quantity: 1
        }));

        return {
          menuID: i.id,
          quantity: i.qty,
          priceAtPurchase: Number(i.price || 0),

          // KIOSK-COMPATIBLE FORMAT
          size: i.modifications?.size ?? null,
          sweetness: i.modifications?.sweetness ?? null,
          ice: i.modifications?.ice ?? null,
          temperature: i.modifications?.temperature ?? null,

          // Kitchen reads these:
          modifications: toppingMods
        };
      });

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
      setSelectedIndex(null);
      alert("Order submitted!");
    } catch (err) {
      console.error("Error submitting order:", err);
      alert("There was a problem submitting the order.");
    }
  };

  // 🔥 NEW — remove selected item instead of last item
  const removeItem = () => {
    if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= order.length) {
      alert("Select an item to remove.");
      return;
    }

    setOrder((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(null);
  };

  // Calculate total
  const total = order
    .reduce((acc, i) => acc + Number(i.price || 0) * i.qty, 0)
    .toFixed(2);

  // Open modifier popup
  const handleOpenModifier = (item) => {
    setModTarget(item);
    setModToppings([]);
    setModSweetness("100%");
    setModIce("Regular Ice");
    setModTemp("Cold");
    setModSize("Medium");
    setShowModifier(true);
  };

  const handleConfirmModifier = () => {
    if (!modTarget) {
      setShowModifier(false);
      return;
    }

    let finalPrice = Number(modTarget.price || 0);

    if (modSize === "Small") finalPrice -= 0.5;
    if (modSize === "Large") finalPrice += 0.5;

    finalPrice += modToppings.length * 1;

    const modifications = {
      toppings: modToppings,
      size: modSize,
      sweetness: modSweetness,
      ice: modIce,
      temperature: modTemp,
      finalPrice,
    };

    addToOrder({
      ...modTarget,
      modifications,
      price: finalPrice,
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
        {/* LEFT SIDE — MENU */}
        <section className="panel">
          <div className="menu-header">
            <button
              className="btn"
              onClick={() => setShowSortModal(true)}
              style={{ marginLeft: "auto" }}
            >
              Sort by Price
            </button>

            <input
              type="search"
              placeholder="Search menu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search"
            />

            <div className="category-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`tab ${filter === cat ? "active" : ""}`}
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

        {/* RIGHT SIDE — ORDER */}
        <aside className="panel">
          <div className="order-header">
            <h2>Current Order</h2>

            {/* Remove selected item */}
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
                  className={`order-item ${
                    idx === selectedIndex ? "selected" : ""
                  }`}
                  onClick={() => setSelectedIndex(idx)} // NEW
                  style={{
                    cursor: "pointer",
                    border:
                      idx === selectedIndex
                        ? "2px solid #500000"
                        : "1px solid var(--border)",
                  }}
                >
                  <div className="name">
                    <strong>{line.name}</strong>

                    {line.modifications?.size && (
                      <div className="mods">
                        Size: {line.modifications.size}
                      </div>
                    )}
                    {line.modifications?.sweetness !== undefined && (
                      <div className="mods">
                        Sweetness: {line.modifications.sweetness}
                      </div>
                    )}
                    {line.modifications?.ice && (
                      <div className="mods">
                        Ice: {line.modifications.ice}
                      </div>
                    )}
                    {line.modifications?.temperature && (
                      <div className="mods">
                        Temp: {line.modifications.temperature}
                      </div>
                    )}
                    {line.modifications?.toppings?.length > 0 && (
                      <div className="mods">
                        Toppings:{" "}
                        {line.modifications.toppings
                          .map((t) => `${t.name} (+$1)`)
                          .join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="qty">x{line.qty}</div>
                  <div className="subtotal">
                    ${(Number(line.price || 0) * line.qty).toFixed(2)}
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

            {/* TOPPINGS */}
            <div className="mod-section">
              <p className="mod-heading">Select ingredients / toppings:</p>

              <div className="topping-scroll">
                <div className="topping-grid">
                  {toppingOptions.map((t) => (
                    <label key={t.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={modToppings.some((x) => x.id === t.id)}
                        onChange={(e) => {
                          setModToppings((prev) =>
                            e.target.checked
                              ? [...prev, t]
                              : prev.filter((x) => x.id !== t.id)
                          );
                        }}
                      />
                      {t.name} — <strong>$1.00</strong>
                    </label>
                  ))}
                </div>
              </div>
            </div>


            {/* SWEETNESS */}
            <div className="mod-section">
              <p>Sweetness Level:</p>
              <select
                value={modSweetness}
                onChange={(e) => setModSweetness(e.target.value)}
                className="search"
                style={{ padding: "8px", borderRadius: "8px" }}
              >
                <option>None</option>
                <option>Easy</option>
                <option>Regular</option>
                <option>Extra</option>
              </select>
            </div>

            {/* ICE */}
            <div className="mod-section">
              <p>Ice Level:</p>
              <select
                value={modIce}
                onChange={(e) => setModIce(e.target.value)}
                className="search"
                style={{ padding: "8px", borderRadius: "8px" }}
              >
                <option>No Ice</option>
                <option>Easy Ice</option>
                <option>Regular Ice</option>
                <option>Extra Ice</option>
              </select>
            </div>

            {/* TEMP */}
            <div className="mod-section">
              <p>Temperature:</p>
              <select
                value={modTemp}
                onChange={(e) => setModTemp(e.target.value)}
                className="search"
                style={{ padding: "8px", borderRadius: "8px" }}
              >
                <option>Cold</option>
                <option>Hot</option>
              </select>
            </div>

            {/* SIZE */}
            <div className="mod-section">
              <p>Select size:</p>
              <select
                value={modSize}
                onChange={(e) => setModSize(e.target.value)}
                className="search"
                style={{ padding: "8px", borderRadius: "8px" }}
              >
                <option value="Small">Small (-$0.50)</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large (+$0.50)</option>
              </select>
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

      {/* SORT MODAL */}
{showSortModal && (
  <div className="modal-backdrop">
    <div className="modal" style={{ maxWidth: "500px" }}>
      <h2>Menu Sorted by Price (High → Low)</h2>

      <div style={{
        maxHeight: "60vh",
        overflowY: "auto",
        padding: "10px",
        lineHeight: "1.6"
      }}>
        {menuItems
          .slice()
          .sort((a, b) => Number(b.price) - Number(a.price))
          .map((item) => (
            <div key={item.id} style={{ padding: "6px 0", borderBottom: "1px solid #ddd" }}>
              {item.name} — ${Number(item.price).toFixed(2)}
            </div>
          ))}
      </div>

      <button
        className="btn danger"
        onClick={() => setShowSortModal(false)}
        style={{ marginTop: "16px" }}
      >
        Close
      </button>
    </div>
  </div>
)}


      {/* CSS */}
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

        /* Toppings arranged in 3 columns */
        .topping-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px 20px;
        }

        /* Heading stays fixed at top */
        .mod-heading {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 6px;
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
          color: white;
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

        /* ORDER SIDE */
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
          border-radius: 10px;
          padding: 8px 10px;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: center;
          background: #fff;
          transition: 0.15s;
        }

        .order-item.selected {
          background: #ffe2e2;
          border: 2px solid #500000 !important;
        }

        .order-item:hover {
          background: #f5f5f5;
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

        /* MODAL */
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
          padding: 28px;
          border-radius: 14px;

          /* NEW WIDTH — Much wider and better layout */
          width: 650px;
          max-width: 95vw;

          display: flex;
          flex-direction: column;
          gap: 18px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);

          /* Allow scrolling inside the modal if needed */
          max-height: 90vh;
          overflow-y: auto;
        }
        /* Only this part scrolls */
        .topping-scroll {
          max-height: 260px;
          overflow-y: auto;
          padding-right: 6px;
        }

        /* Container – full width, NOT scrollable */
        .mod-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }


        .mods-empty {
          font-size: 13px;
          color: #6b7280;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
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
