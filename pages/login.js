import { useState } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("Manager");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin() {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, password }),
    });

    const data = await res.json();

    if (!data.success) {
      setError("Incorrect password.");
      return;
    }

    // Redirect based on role
    if (role === "Manager") router.push("/manager");
    if (role === "Cashier") router.push("/cashier");
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>BOBA POS</h1>

        {/* --- Kiosk Mode --- */}
        <button
          style={styles.kioskButton}
          onClick={() => router.push("/kiosk")}
        >
          Kiosk Mode (No Login Required)
        </button>

        <hr style={{ margin: "20px 0", width: "100%" }} />

        {/* --- Employee Login --- */}
        <h2>Employee Login</h2>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={styles.select}
        >
          <option>Manager</option>
          <option>Cashier</option>
        </select>

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.loginButton} onClick={handleLogin}>
          Login as {role}
        </button>

      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f5f5f5",
  },
  card: {
    background: "white",
    padding: "35px",
    borderRadius: "10px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    textAlign: "center",
    width: "350px",
  },
  title: {
    marginBottom: "25px",
  },
  kioskButton: {
    width: "100%",
    padding: "15px",
    background: "#6d4cff",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "20px",
    fontWeight: "bold",
  },
  select: {
    width: "100%",
    padding: "10px",
    marginTop: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginTop: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  loginButton: {
    width: "100%",
    padding: "12px",
    marginTop: "20px",
    background: "#4CAF50",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  error: {
    color: "red",
    marginTop: "10px",
  },
};
