import { useState, useMemo } from "react";
import Link from "next/link";
import "./manager.css";  // <-- IMPORTANT: loads the external stylesheet

export default function ManagerPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const [query, setQuery] = useState("");

  const [sales] = useState([
    { id: 1, date: "2025-11-01", item: "Brown Sugar Milk Tea", qty: 32, total: 192.0 },
    { id: 2, date: "2025-11-02", item: "Taro Milk Tea", qty: 21, total: 126.0 },
    { id: 3, date: "2025-11-03", item: "Oolong Tea", qty: 14, total: 70.0 },
  ]);

  const [menuItems, setMenuItems] = useState([
    { id: 1, name: "Brown Sugar Milk Tea", category: "Milk Tea", price: 6.0, seasonal: false },
    { id: 2, name: "Taro Milk Tea", category: "Milk Tea", price: 6.0, seasonal: false },
    { id: 3, name: "Oolong Tea", category: "Tea", price: 5.0, seasonal: true },
  ]);

  const [inventory, setInventory] = useState([
    { id: 1, name: "Tapioca Pearls", quantity: 120, restockMin: 50 },
    { id: 2, name: "Tea Leaves", quantity: 60, restockMin: 30 },
    { id: 3, name: "Cups", quantity: 300, restockMin: 100 },
  ]);

  const filteredMenu = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [query, menuItems]);

  const filteredInventory = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        String(i.quantity).includes(q)
    );
  }, [query, inventory]);

  function handleAddMenuItem() { console.log("Add Menu Item"); }
  function handleUpdateMenuItem() { console.log("Update Menu Item"); }
  function handleAddInventory() { console.log("Add Inventory Item"); }
  function handleUpdateInventory() { console.log("Update Inventory Item"); }
  function handleOrderRestock(item) { console.log("Restock ordered for:", item.name); }

  const SalesTab = (
    <section className="panel">
      <div className="panel-header">
        <h2>Sales</h2>
        <input
          type="search"
          placeholder="Search (item/date)…"
          className="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Item</th><th>Qty</th><th>Total ($)</th></tr>
          </thead>
          <tbody>
            {sales
              .filter((s) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (
                  s.item.toLowerCase().includes(q) ||
                  s.date.includes(q)
                );
              })
              .map((s) => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.item}</td>
                  <td>{s.qty}</td>
                  <td>{s.total.toFixed(2)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const MenuTab = (
    <section className="panel">
      <div className="panel-header">
        <h2>Menu Items</h2>
        <div className="actions">
          <button className="btn primary" onClick={handleAddMenuItem}>Add</button>
          <button className="btn" onClick={handleUpdateMenuItem}>Update</button>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search menu…"
        className="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Category</th><th>Price</th><th>Seasonal</th>
            </tr>
          </thead>
          <tbody>
            {filteredMenu.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.category}</td>
                <td>{m.price.toFixed(2)}</td>
                <td>{m.seasonal ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const InventoryTab = (
    <section className="panel">
      <div className="panel-header">
        <h2>Inventory</h2>
        <div className="actions">
          <button className="btn primary" onClick={handleAddInventory}>Add</button>
          <button className="btn" onClick={handleUpdateInventory}>Update</button>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search inventory…"
        className="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Min</th></tr>
          </thead>
          <tbody>
            {filteredInventory.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.quantity}</td>
                <td>{i.restockMin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const RestockTab = (
    <section className="panel">
      <div className="panel-header">
        <h2>Order Restocks</h2>
      </div>

      <ul className="restock-list">
        {inventory.map((i) => (
          <li key={i.id} className="restock-item">
            <div className="restock-main">
              <span className="restock-name">{i.name}</span>
              <span className="restock-meta">Current: {i.quantity} • Min: {i.restockMin}</span>
            </div>
            <button className="btn success" onClick={() => handleOrderRestock(i)}>
              Order
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="wrap">
      <header className="topbar">
        <h1 className="title">Manager Dashboard</h1>

        <nav className="links">
          <Link className="link" href="/cashier">Cashier</Link>
          <Link className="link" href="/kiosk">Kiosk</Link>
        </nav>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <button className={`tab ${activeTab === "sales" ? "active" : ""}`} onClick={() => setActiveTab("sales")}>
            Sales
          </button>
          <button className={`tab ${activeTab === "menu" ? "active" : ""}`} onClick={() => setActiveTab("menu")}>
            Menu Items
          </button>
          <button className={`tab ${activeTab === "inventory" ? "active" : ""}`} onClick={() => setActiveTab("inventory")}>
            Inventory
          </button>
          <button className={`tab ${activeTab === "restock" ? "active" : ""}`} onClick={() => setActiveTab("restock")}>
            Restocks
          </button>
        </aside>

        <section className="content">
          {activeTab === "sales" && SalesTab}
          {activeTab === "menu" && MenuTab}
          {activeTab === "inventory" && InventoryTab}
          {activeTab === "restock" && RestockTab}
        </section>
      </main>
    </div>
  );
}
