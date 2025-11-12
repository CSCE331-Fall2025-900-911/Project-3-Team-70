// pages/kitchen.js
import { useEffect, useState } from 'react';

export default function KitchenPage() {
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Load both lists
  useEffect(() => {
    async function fetchOrders() {
      const currentRes = await fetch('/api/kitchen?type=current');
      const completedRes = await fetch('/api/kitchen?type=completed');
      const [current, done] = await Promise.all([currentRes.json(), completedRes.json()]);
      setInProgress(current);
      setCompleted(done);
    }
    fetchOrders();
  }, []);

  async function completeOrder(id) {
    await fetch(`/api/kitchen?id=${id}`, { method: 'PATCH' });
    alert(`Order #${id} marked complete!`);
    setSelectedOrder(null);
    // Refresh data
    const currentRes = await fetch('/api/kitchen?type=current');
    const completedRes = await fetch('/api/kitchen?type=completed');
    const [current, done] = await Promise.all([currentRes.json(), completedRes.json()]);
    setInProgress(current);
    setCompleted(done);
  }

  return (
    <div className="kitchen">
      <h1>Kitchen View</h1>

      <section>
        <h2>Orders In Progress</h2>
        {inProgress.map((order) => (
          <div
            key={order.orderid}
            className={`order ${selectedOrder === order.orderid ? 'selected' : ''}`}
            onClick={() => setSelectedOrder(order.orderid)}
          >
            <p>Order #{order.orderid}</p>
            <p>Total: ${order.ordertotal}</p>
          </div>
        ))}
      </section>

      {selectedOrder && (
        <button
          className="btn success"
          onClick={() => completeOrder(selectedOrder)}
        >
          ✅ Complete Order #{selectedOrder}
        </button>
      )}

      <section>
        <h2>Completed Orders (Today)</h2>
        {completed.map((order) => (
          <div key={order.orderid}>
            <p>Order #{order.orderid} — ${order.ordertotal}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

