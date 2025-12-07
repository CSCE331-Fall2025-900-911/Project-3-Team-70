import Link from "next/link";

export default function LoginPage() {
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
          Staff Login
        </h1>
        <p style={{ fontSize: 14, marginBottom: 20 }}>
          Choose how you want to sign in:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/auth/employee-access">
            <button
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #4b5563",
                background: "#0f172a",
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              Employee Login
            </button>
          </Link>

          <Link href="/auth/manager-access">
            <button
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #f59e0b",
                background: "#f59e0b",
                color: "#111827",
                cursor: "pointer",
              }}
            >
              Manager Login
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}