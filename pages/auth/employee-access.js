// pages/auth/employee-access.js
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function EmployeeAccess() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      const res = await fetch("/api/staff/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: pw,
          requestedRole: "employee",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Invalid password");
        return;
      }

      await signIn("google", {
        callbackUrl: "/cashier",
      });
    } catch (error) {
      console.error("Employee access error:", error);
      setErr("Something went wrong. Please try again.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020617",
        color: "#f9fafb",
      }}
    >
      <div
        style={{
          padding: 24,
          borderRadius: 12,
          border: "1px solid #374151",
          background: "#111827",
          maxWidth: 360,
          width: "100%",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>
          Employee Access
        </h1>
        <p style={{ fontSize: 14, marginBottom: 16 }}>
          Enter the employee password, then sign in with Google.
        </p>

        <form
          onSubmit={submit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Employee Password"
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid #4b5563",
              background: "#020617",
              color: "#f9fafb",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #22c55e",
              background: "#22c55e",
              color: "#022c22",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Continue with Google
          </button>
        </form>

        {err && (
          <p style={{ color: "#fca5a5", marginTop: 10, fontSize: 14 }}>
            {err}
          </p>
        )}
      </div>
    </div>
  );
}
