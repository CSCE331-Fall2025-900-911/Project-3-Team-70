import { useState } from 'react';

export default function TestBillPage() {
  const [orderID, setOrderID] = useState('');
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBill = async () => {
    if (!orderID) return;

    setLoading(true);
    setError(null);
    setBill(null);

    try {
      const res = await fetch(`/api/generate-bill?orderID=${orderID}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch bill');
      } else {
        setBill(data);
      }
    } catch (err) {
      setError('Error fetching bill');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Bill Generator</h1>

      <input
        type="text"
        placeholder="Enter Order ID"
        value={orderID}
        onChange={(e) => setOrderID(e.target.value)}
        style={{ padding: '0.5rem', fontSize: '1rem', width: '200px' }}
      />
      <button
        onClick={fetchBill}
        style={{ marginLeft: '1rem', padding: '0.5rem 1rem', fontSize: '1rem' }}
      >
        Generate Bill
      </button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {bill && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Bill for Order ID: {bill.orderID}</h2>
          {bill.items.map((item) => (
            <div key={item.orderItemID} style={{ marginBottom: '1rem' }}>
              <p>
                <strong>{item.name}</strong> x {item.quantity} (Size: {item.size})
              </p>
              <p>Price per item: ${item.pricePerItem.toFixed(2)}</p>
              {item.modifications.length > 0 && (
                <ul>
                  {item.modifications.map((mod) => (
                    <li key={mod.modificationID}>
                      {mod.name} x {mod.quantity} (+${mod.cost.toFixed(2)})
                    </li>
                  ))}
                </ul>
              )}
              <p>
                <strong>Total Item Price: ${item.totalPrice.toFixed(2)}</strong>
              </p>
              <hr />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
