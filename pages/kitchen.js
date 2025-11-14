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

    setSelectedOrder(null);

    // Refresh data
    const currentRes = await fetch('/api/kitchen?type=current');
    const completedRes = await fetch('/api/kitchen?type=completed');
    const [current, done] = await Promise.all([currentRes.json(), completedRes.json()]);
    setInProgress(current);
    setCompleted(done);
  }

  return (
    <div className="kitchen-container" style={styles.page}>
      
      <div style={styles.column}>
        <h2 style={styles.heading}>In Progress</h2>
        <div style={styles.scroll}>
          {inProgress.map((order) => (
            <div
              key={order.orderid}
              onClick={() => setSelectedOrder(order.orderid)}
              style={{
                ...styles.row,
                backgroundColor:
                  selectedOrder === order.orderid ? '#d1ffd1' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <p><strong>Order #{order.orderid}</strong></p>
              <p>Total: ${order.ordertotal}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Column - Action Button */}
      <div style={styles.centerColumn}>
        {selectedOrder && (
          <button style={styles.button} onClick={() => completeOrder(selectedOrder)}>
            Complete Order #{selectedOrder}
          </button>
        )}
      </div>

      <div style={styles.column}>
        <h2 style={styles.heading}>Completed</h2>
        <div style={styles.scroll}>
          {completed.map((order) => (
            <div key={order.orderid} style={styles.row}>
              <p><strong>Order #{order.orderid}</strong></p>
              <p>${order.ordertotal}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    gap: "30px",
    padding: "20px",
    height: "100vh",
    background: "#f7f7f7",
  },
  column: {
    flex: 1,
    background: "white",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  centerColumn: {
    width: "200px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    marginBottom: "15px",
    textAlign: "center",
  },
  scroll: {
    overflowY: "auto",
    flex: 1,
  },
  row: {
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "white",
  },
  button: {
    padding: "15px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#4CAF50",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
    width: "100%",
  },
};


