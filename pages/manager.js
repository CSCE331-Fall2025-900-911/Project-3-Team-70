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

  const [sales, setSales] = useState([]);

  const [menuItems, setMenuItems] = useState([
    {
      id: 1,
      name: "Brown Sugar Milk Tea",
      category: "Milk Tea",
      price: 6.0,
      seasonal: false,
    },
    {
      id: 2,
      name: "Taro Milk Tea",
      category: "Milk Tea",
      price: 6.0,
      seasonal: false,
    },
    {
      id: 3,
      name: "Oolong Tea",
      category: "Tea",
      price: 5.0,
      seasonal: true,
    },
  ]);

  const [inventory, setInventory] = useState([
    { id: 1, name: "Tapioca Pearls", quantity: 120, restockMin: 50 },
    { id: 2, name: "Tea Leaves", quantity: 60, restockMin: 30 },
    { id: 3, name: "Cups", quantity: 300, restockMin: 100 },
  ]);

  const [xReportRows, setXReportRows] = useState([]);
  const [zReportRows, setZReportRows] = useState([]);

  function generateXReport() {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    const today = new Date().toISOString().slice(0, 10);

    const todaysOrders = orders.filter((o) =>
      o.time.startsWith(today)
    );

    const rows = [];

    todaysOrders.forEach((order) => {
      const dateTime = new Date(order.time);
      const formatted = `${dateTime.toLocaleDateString()} ${dateTime.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;

      order.items.forEach((item) => {
        rows.push({
          time: formatted,
          item: item.name,
          price: Number(item.price),
          totalRow: false,
        });
      });

      rows.push({
        time: "",
        item: "Order Total",
        price: order.total,
        totalRow: true,
      });
    });

    setZReportRows([]);
    setXReportRows(rows);
  }

  useEffect(() => {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");

    const transformed = orders.flatMap((order) =>
      order.items.map((item) => ({
        id: `${order.id}-${item.name}`,
        date: order.time.slice(0, 10),
        item: item.name,
        qty: 1,
        total: Number(item.price),
      }))
    );

    setSales(transformed);
  }, []);

  function generateZReport() {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    const today = new Date().toISOString().slice(0, 10);

    const todaysOrders = orders.filter((o) =>
      o.time.startsWith(today)
    );

    const grandTotal = todaysOrders.reduce(
      (acc, order) => acc + order.total,
      0
    );

    setXReportRows([]);

    setZReportRows([
      {
        label: "Total Revenue",
        total: grandTotal,
      },
    ]);
  }

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
              <span className={styles.restockName}>{i.name}</span>
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
          <h3>X-Report — {new Date().toLocaleDateString()}</h3>

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
                      ? { fontWeight: "bold", background: "#eee" }
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
          <h3>Z-Report — {new Date().toLocaleDateString()}</h3>

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
