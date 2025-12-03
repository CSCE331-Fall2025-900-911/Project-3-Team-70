// pages/manager.js
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getSession } from "next-auth/react";
import styles from "./manager.module.css";

// 🔐 Protect manager: manager only
export async function getServerSideProps(ctx) {
  const session = await getSession(ctx);

  if (!session || session.user.role !== "manager") {
    return {
      redirect: { destination: "/unauthorized", permanent: false },
    };
  }

  return { props: {} };
}

export default function ManagerPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const [query, setQuery] = useState("");

  // Sales rows from DB (kitchen-completed orders)
  const [sales, setSales] = useState([]);

  // Live menu & inventory from DB instead of hard-coded placeholders
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState([]);

  // X/Z reports derived from `sales`
  const [xReportRows, setXReportRows] = useState([]);
  const [zReportRows, setZReportRows] = useState([]);

  // Load data from APIs on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Sales: completed orders joined with orderItem + menu
        const salesRes = await fetch("/api/manager/sales");
        if (salesRes.ok) {
          const salesJson = await salesRes.json();
          const transformed = salesJson.map((row) => {
            const dateISO = row.orderdate;
            const d = new Date(dateISO);

            return {
              id: `${row.orderid}-${row.item}-${dateISO}`,
              date: dateISO.slice(0, 10),
              time: d.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              item: row.item,
              qty: Number(row.qty || 0),
              total: Number(row.total || 0),
            };
          });
          setSales(transformed);
        } else {
          console.error("Failed to load sales");
        }
      } catch (err) {
        console.error("Error loading sales:", err);
      }

      try {
        // Menu items from DB
        const menuRes = await fetch("/api/menu");
        if (menuRes.ok) {
          const menuJson = await menuRes.json();
          const normalized = menuJson.map((m) => ({
            id: m.menuid,
            name: m.menuname,
            category: m.category,
            price: Number(m.price || 0),
            seasonal:
              !!m.seasonalstart && !!m.seasonalend,
          }));
          setMenuItems(normalized);
        }
      } catch (err) {
        console.error("Error loading menu:", err);
      }

      try {
        // Inventory from DB
        const invRes = await fetch("/api/inventory");
        if (invRes.ok) {
          const invJson = await invRes.json();
          const normalized = invJson.map((i) => ({
            id: i.inventoryid,
            name: i.inventoryname,
            quantity: Number(i.quantityavailable || 0),
            restockMin: Number(i.restockmin || 0),
          }));
          setInventory(normalized);
        }
      } catch (err) {
        console.error("Error loading inventory:", err);
      }
    }

    loadData();
  }, []);

  // ---- Reports: derive from `sales` instead of localStorage ----
  function generateXReport() {
    const today = new Date().toISOString().slice(0, 10);

    const todaysSales = sales.filter(
      (s) => s.date === today
    );

    const rows = [];

    todaysSales.forEach((s) => {
      rows.push({
        time: `${s.date} ${s.time}`,
        item: s.item,
        price: s.total, // total for that row
        totalRow: false,
      });
    });

    // Optional: add a grand total row at bottom
    const grandTotal = todaysSales.reduce(
      (acc, s) => acc + s.total,
      0
    );
    if (todaysSales.length > 0) {
      rows.push({
        time: "",
        item: "Order Total",
        price: grandTotal,
        totalRow: true,
      });
    }

    setZReportRows([]);
    setXReportRows(rows);
  }

  function generateZReport() {
    const today = new Date().toISOString().slice(0, 10);

    const todaysSales = sales.filter(
      (s) => s.date === today
    );

    const grandTotal = todaysSales.reduce(
      (acc, s) => acc + s.total,
      0
    );

    setXReportRows([]);
    setZReportRows([
      {
        label: "Total Revenue (Completed Orders)",
        total: grandTotal,
      },
    ]);
  }

  // ---- Filtering helpers ----
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

  // ---- Placeholder handlers (same as before) ----
  function handleAddMenuItem() {
    console.log("Add menu item");
  }
  function handleUpdateMenuItem() {
    console.log("Update menu item");
  }
  function handleAddInventory() {
    console.log("Add inventory");
  }
  function handleUpdateInventory() {
    console.log("Update inventory");
  }
  function handleOrderRestock(item) {
    console.log("Restock ordered:", item.name);
  }

  // ---- Tabs (mostly unchanged, just using new state) ----

  const SalesTab = (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Sales</h2>
        <input
          type="search"
          placeholder="Search (item/date)…"
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Total ($)</th>
            </tr>
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
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Menu Items</h2>
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.primary}`}
            onClick={handleAddMenuItem}
          >
            Add
          </button>
          <button
            className={styles.btn}
            onClick={handleUpdateMenuItem}
          >
            Update
          </button>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search menu…"
        className={styles.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Seasonal</th>
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
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Inventory</h2>
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.primary}`}
            onClick={handleAddInventory}
          >
            Add
          </button>
          <button
            className={styles.btn}
            onClick={handleUpdateInventory}
          >
            Update
          </button>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search inventory…"
        className={styles.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Min</th>
            </tr>
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
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Order Restocks</h2>
      </div>

      <ul className={styles.restockList}>
        {inventory.map((i) => (
          <li key={i.id} className={styles.restockItem}>
            <div className={styles.restockMain}>
              <span className={styles.restockName}>
                {i.name}
              </span>
              <span className={styles.restockMeta}>
                Current: {i.quantity} • Min: {i.restockMin}
              </span>
            </div>
            <button
              className={`${styles.btn} ${styles.success}`}
              onClick={() => handleOrderRestock(i)}
            >
              Order
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  const ReportsTab = (
    <section className={styles.panel}>
      <h2>Reports</h2>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <button
          className={styles.btn}
          style={{
            backgroundColor: "#900",
            color: "#fff",
            marginLeft: "10px",
          }}
          onClick={generateXReport}
        >
          Run X Report
        </button>

        <button
          className={styles.btn}
          style={{
            backgroundColor: "#900",
            color: "#fff",
            marginLeft: "10px",
          }}
          onClick={generateZReport}
        >
          Run Z Report
        </button>
      </div>

      {xReportRows.length > 0 && (
        <div className={styles.tableWrap}>
          <h3>
            X-Report — {new Date().toLocaleDateString()}
          </h3>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Item</th>
                <th>Price ($)</th>
              </tr>
            </thead>
            <tbody>
              {xReportRows.map((row, index) => (
                <tr
                  key={index}
                  style={
                    row.totalRow
                      ? {
                          fontWeight: "bold",
                          background: "#eee",
                        }
                      : {}
                  }
                >
                  <td>{row.time}</td>
                  <td>{row.item}</td>
                  <td>{row.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {zReportRows.length > 0 && (
        <div
          className={styles.tableWrap}
          style={{ marginTop: "30px" }}
        >
          <h3>
            Z-Report — {new Date().toLocaleDateString()}
          </h3>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Total ($)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ fontWeight: "bold" }}>
                <td>{zReportRows[0].label}</td>
                <td>{zReportRows[0].total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div className={styles.wrap}>
      <header className={styles.topbar}>
        <h1 className={styles.title}>Manager Dashboard</h1>

        {/* Manager can navigate between views */}
        <nav className={styles.links}>
          <Link className={styles.link} href="/cashier">
            Cashier
          </Link>
          <Link className={styles.link} href="/kitchen">
            Kitchen
          </Link>
          <Link className={styles.link} href="/kiosk">
            Kiosk
          </Link>
        </nav>
      </header>

      <main className={styles.layout}>
        <aside className={styles.sidebar}>
          <button
            className={`${styles.tab} ${
              activeTab === "sales" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("sales")}
          >
            Sales
          </button>

          <button
            className={`${styles.tab} ${
              activeTab === "menu" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("menu")}
          >
            Menu Items
          </button>

          <button
            className={`${styles.tab} ${
              activeTab === "inventory" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("inventory")}
          >
            Inventory
          </button>

          <button
            className={`${styles.tab} ${
              activeTab === "restock" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("restock")}
          >
            Restocks
          </button>

          <button
            className={`${styles.tab} ${
              activeTab === "reports" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </button>
        </aside>

        <section className={styles.content}>
          {activeTab === "sales" && SalesTab}
          {activeTab === "menu" && MenuTab}
          {activeTab === "inventory" && InventoryTab}
          {activeTab === "restock" && RestockTab}
          {activeTab === "reports" && ReportsTab}
        </section>
      </main>
    </div>
  );
}
