import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import styles from "./manager.module.css";

export default function ManagerPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const [query, setQuery] = useState("");

  const [sales, setSales] = useState([]);

  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    async function fetchMenuItems() {
      try {
        const response = await fetch("/api/menu");
        const data = await response.json();

        const today = new Date();

        setMenuItems(
          data.map((item) => {
            const start = item.seasonalstart ? new Date(item.seasonalstart) : null;
            const end = item.seasonalend ? new Date(item.seasonalend) : null;

            const ALL_YEAR_START = "2025-01-01T00:00:00";
            const ALL_YEAR_END = "2025-12-31T23:59:59";

            let seasonalDisplay = "All Year";

            if (item.seasonalstart && item.seasonalend) {
              const startDateStr = item.seasonalstart.slice(0, 10);
              const endDateStr = item.seasonalend.slice(0, 10);

              const isAllYear =
                startDateStr === "2025-01-01" && endDateStr === "2025-12-31";

              if (!isAllYear) {
                const startStr = new Date(item.seasonalstart).toLocaleDateString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                );

                const endStr = new Date(item.seasonalend).toLocaleDateString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                );

                seasonalDisplay = `${startStr} → ${endStr}`;
              }
            }

            return {
              id: item.menuid,
              name: item.menuname,
              category: item.category,
              price: Number(item.price),
              seasonal: seasonalDisplay,
              seasonalStart: item.seasonalstart,
              seasonalEnd: item.seasonalend,
            };
          })
        );
      } catch (err) {
        console.error("Failed to load menu:", err);
      }
    }

    fetchMenuItems();
  }, []);

  const [inventory, setInventory] = useState([
    { id: 1, name: "Tapioca Pearls", quantity: 120, restockMin: 50 },
    { id: 2, name: "Tea Leaves", quantity: 60, restockMin: 30 },
    { id: 3, name: "Cups", quantity: 300, restockMin: 100 },
  ]);

  const [xReportRows, setXReportRows] = useState([]);
  const [zReportRows, setZReportRows] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
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
        const menuRes = await fetch("/api/menu");
        if (menuRes.ok) {
          const menuJson = await menuRes.json();
          const normalized = menuJson.map((m) => ({
            id: m.menuid,
            name: m.menuname,
            category: m.category,
            price: Number(m.price || 0),
            seasonal: !!m.seasonalstart && !!m.seasonalend,
          }));
          setMenuItems(normalized);
        }
      } catch (err) {
        console.error("Error loading menu:", err);
      }

      try {
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

  function generateXReport() {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    const today = new Date().toISOString().slice(0, 10);

    const todaysOrders = orders.filter((o) => o.time.startsWith(today));

    const rows = [];

    todaysOrders.forEach((order) => {
      const dateTime = new Date(order.time);
      const formatted = `${dateTime.toLocaleDateString()} ${dateTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      order.items.forEach((item) => {
        rows.push({
          time: formatted,
          item: item.name,
          price: Number(item.price),
          totalRow: false,
        });
      });

      const grandTotal = todaysSales.reduce((acc, s) => acc + s.total, 0);
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
    });
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

    const todaysOrders = orders.filter((o) => o.time.startsWith(today));

    const grandTotal = todaysOrders.reduce((acc, order) => acc + order.total, 0);

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

  const [salesSummary, setSalesSummary] = useState(null);
  const [salesHourly, setSalesHourly] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function fetchSales() {
    try {
      setSalesLoading(true);
      setSalesError(null);

      let url = "/api/sales";

      if (startDate && endDate) {
        url += `?start=${startDate} 00:00:00&end=${endDate} 23:59:59`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();
      setSalesSummary(data.summary || null);
      setSalesHourly(data.hourly || []);
      setSalesOrders(data.orders || []);
    } catch (err) {
      console.error("Failed to fetch sales:", err);
      setSalesError("Failed to load sales data.");
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    fetchSales();
  }, []);

  const SalesTab = (
    <section className={styles.panel}>
      <h2>Sales</h2>

      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
        <div>
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button onClick={fetchSales}>Generate</button>
      </div>

      {salesLoading && <p>Loading sales...</p>}
      {salesError && <p style={{ color: "red" }}>{salesError}</p>}

      {salesSummary && !salesLoading && (
        <div className={styles.summaryBox}>
          <p>
            <strong>Total Sales:</strong> $
            {Number(salesSummary.totalsales).toFixed(2)}
          </p>
          <p>
            <strong>Total Orders:</strong> {salesSummary.totalorders}
          </p>
          <p>
            <strong>First Order:</strong>{" "}
            {salesSummary.firstorder
              ? new Date(salesSummary.firstorder).toLocaleString()
              : "—"}
          </p>
          <p>
            <strong>Last Order:</strong>{" "}
            {salesSummary.lastorder
              ? new Date(salesSummary.lastorder).toLocaleString()
              : "—"}
          </p>
        </div>
      )}

      {salesOrders.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Employee ID</th>
                <th>Location</th>
                <th>Date</th>
                <th>Total ($)</th>
              </tr>
            </thead>
            <tbody>
              {salesOrders
                .filter((row) => {
                  const q = query.trim().toLowerCase();
                  if (!q) return true;

                  return (
                    String(row.orderid).includes(q) ||
                    String(row.employeeid).includes(q) ||
                    (row.orderlocation || "")
                      .toLowerCase()
                      .includes(q) ||
                    (row.orderdate || "").toString().includes(q)
                  );
                })
                .map((row) => (
                  <tr key={row.orderid}>
                    <td>{row.orderid}</td>
                    <td>{row.employeeid}</td>
                    <td>{row.orderlocation}</td>
                    <td>
                      {row.orderdate
                        ? new Date(row.orderdate).toLocaleString()
                        : ""}
                    </td>
                    <td>{Number(row.ordertotal).toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
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
          <button className={styles.btn} onClick={handleUpdateMenuItem}>
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
                <td>{m.seasonal}</td>
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
          <button className={styles.btn} onClick={handleUpdateInventory}>
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

      {zReportRows.length > 0 && (
        <div className={styles.tableWrap} style={{ marginTop: "30px" }}>
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