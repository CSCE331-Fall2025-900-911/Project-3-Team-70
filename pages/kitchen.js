import { useState, useEffect } from "react";

export default function KitchenPage() {
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    async function fetchOrders() {
        try {
        const currentRes = await fetch('/api/kitchen?type=current');
        const completedRes = await fetch('/api/kitchen?type=completed');
        const [currentData, completedData] = await Promise.all([
            currentRes.json(),
            completedRes.json()
        ]);
        setInProgress(currentData);
        setCompleted(completedData);
        } catch (err) {
        console.error('Fetch error:', err);
        }
    }
    fetchOrders();
    }, []);

  return (
    <div className="kitchen-root">
      <header className="header">
        <h1>Kitchen Dashboard</h1>
        <p>Monitor orders in real-time</p>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>Orders In Progress 🍵</h2>
          {inProgress.length === 0 ? (
            <p>No active orders.</p>
          ) : (
            inProgress.map((order) => (
              <div key={order.id} className="card active">
                <div className="top">
                  <span>Order #{order.id}</span>
                  <span>{order.time}</span>
                </div>
                <div className="bottom">
                  <span>Employee: {order.employee}</span>
                  <span>Total: ${order.total.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel">
          <h2>Completed Orders ✅</h2>
          {completed.length === 0 ? (
            <p>No completed orders yet.</p>
          ) : (
            completed.map((order) => (
              <div key={order.id} className="card done">
                <div className="top">
                  <span>Order #{order.id}</span>
                  <span>{order.time}</span>
                </div>
                <div className="bottom">
                  <span>Employee: {order.employee}</span>
                  <span>Total: ${order.total.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      <style jsx>{`
        .kitchen-root {
          font-family: system-ui, sans-serif;
          background: #f9fafb;
          min-height: 100vh;
          padding: 24px;
          color: #111827;
        }
        .header {
          margin-bottom: 20px;
          text-align: center;
        }
        .grid {
          display: grid;
          gap: 20px;
          grid-template-columns: 1fr 1fr;
        }
        .panel {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 10px;
          padding: 10px;
        }
        .card.active {
          background: #fef3c7;
          border-color: #fbbf24;
        }
        .card.done {
          background: #dcfce7;
          border-color: #22c55e;
        }
        .top, .bottom {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }
        h2 {
          margin-bottom: 10px;
          color: #1e293b;
        }
      `}</style>
    </div>
  );
}
