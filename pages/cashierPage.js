import { useState, useEffect } from "react";
import Link from "next/link";

export default function CashierPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [order, setOrder] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  // Simulated fetch for menu data (later replaced with SQL backend call)
  useEffect(() => {
    // TODO: Replace with actual fetch from backend API
    const demoMenu = [
      { id: 1, name: "Classic Milk Tea", price: 4.5, desc: "Black tea, milk, light sweetness", cat: "drinks", img: "https://picsum.photos/seed/milk/600/400" },
      { id: 2, name: "Taro Smoothie", price: 5.25, desc: "Creamy taro blend", cat: "drinks", img: "https://picsum.photos/seed/taro/600/400" },
      { id: 3, name: "Boba Pearls", price: 0.75, desc: "Chewy tapioca topping", cat: "toppings", img: "https://picsum.photos/seed/boba/600/400" },
      { id: 4, name: "Egg Puff", price: 3.25, desc: "Crispy Hong Kong street snack", cat: "snacks", img: "https://picsum.photos/seed/egg/600/400" }
    ];
    setMenuItems(demoMenu);
  }, []);

  // Filtering logic
  const filteredMenu = menuItems.filter((item) => {
    const matchCat = filter === "all" || item.cat === filter;
    const matchQuery = item.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  // Add item to order
  const addToOrder = (item) => {
    setOrder((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      if (existing) {
        return prev.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  // Remove last item (placeholder for now)
  const removeItem = () => {
    setOrder((prev) => prev.slice(0, -1));
  };

  // Total price
  const total = order.reduce((acc, i) => acc + i.price * i.qty, 0).toFixed(2);

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
        {/* Left panel: Menu */}
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
              {['all','drinks','toppings','snacks'].map((cat) => (
                <button
                  key={cat}
                  className={`tab ${filter === cat ? 'active' : ''}`}
                  onClick={() => setFilter(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="menu-scroll">
            <div className="menu-grid">
              {filteredMenu.map((item) => (
                <div key={item.id} className="menu-card">
                  <img src={item.img} alt={item.name} />
                  <div className="title">{item.name}</div>
                  <div className="desc">{item.desc}</div>
                  <div className="row">
                    <div className="price">${item.price.toFixed(2)}</div>
                    <button className="btn primary" onClick={() => addToOrder(item)}>
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right panel: Order */}
        <aside className="panel">
          <div className="order-header">
            <h2>Current Order</h2>
            <button className="btn danger" onClick={removeItem}>Remove Item</button>
          </div>
          <div className="order-list">
            {order.map((line) => (
              <div key={line.id} className="order-item">
                <div className="name">{line.name}</div>
                <div className="qty">x{line.qty}</div>
                <div className="subtotal">${(line.price * line.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="order-footer">
            <div className="total">Total: ${total}</div>
            <button className="btn success" onClick={() => alert("Order submitted (placeholder)")}>Submit Order</button>
          </div>
        </aside>
      </main>

      {/* Embedded styling */}
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

        * { box-sizing: border-box; }
        body, html, .cashier-root { height: 100%; margin: 0; background: var(--bg); font-family: system-ui, sans-serif; }
        .cashier-topbar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; background: var(--panel); border-bottom: 1px solid var(--border);
        }
        .cashier-title { font-weight: 700; }
        .cashier-actions .btn { margin-left: 8px; }

        .cashier-wrap {
          display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; height: calc(100vh - 60px);
          padding: 16px;
        }
        .panel {
          background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
          display: flex; flex-direction: column; overflow: hidden;
        }

        .menu-header { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px; border-bottom: 1px solid var(--border); }
        .search { border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; }
        .category-tabs { display: flex; gap: 8px; }
        .tab { padding: 6px 10px; border-radius: 999px; background: #f3f4f6; border: 1px solid var(--border); cursor: pointer; }
        .tab.active { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }

        .menu-scroll { overflow: auto; padding: 14px; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
        .menu-card { border: 1px solid var(--border); border-radius: 12px; background: #fafafa; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .menu-card img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .btn { border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; font-weight: 600; background: #fff; }
        .btn.primary { background: var(--brand); color: white; border-color: transparent; }
        .btn.success { background: var(--brand-2); color: white; border-color: transparent; }
        .btn.danger { background: var(--danger); color: white; border-color: transparent; }
        .btn.ghost { background: transparent; }

        .order-header, .order-footer { padding: 12px 14px; border-bottom: 1px solid var(--border); }
        .order-footer { border-top: 1px solid var(--border); margin-top: auto; display: flex; justify-content: space-between; align-items: center; }
        .order-list { overflow: auto; padding: 8px 14px; display: flex; flex-direction: column; gap: 8px; }
        .order-item { border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; background: #fff; }
        .total { font-weight: 800; }
      `}</style>
    </div>
  );
}
