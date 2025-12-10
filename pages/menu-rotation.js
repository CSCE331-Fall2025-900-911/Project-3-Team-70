// pages/menu-rotation.js
export default function MenuSelectionPage() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#111",
        color: "#f5f5f5",
        fontFamily: "Segoe UI, sans-serif"
      }}
    >
      <h1 style={{ marginBottom: "40px", fontSize: "36px" }}>
        Select Display Mode
      </h1>

      <div style={{ display: "flex", gap: "40px" }}>
        <a
          href="/menuboard"
          style={{
            padding: "18px 40px",
            background: "#1a1a1a",
            borderRadius: "12px",
            border: "1px solid #333",
            fontSize: "24px",
            textDecoration: "none",
            color: "#f5f5f5",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.4)"
          }}
        >
          Full Menu
        </a>

        <a
          href="/weathermenu"
          style={{
            padding: "18px 40px",
            background: "#1a1a1a",
            borderRadius: "12px",
            border: "1px solid #333",
            fontSize: "24px",
            textDecoration: "none",
            color: "#f5f5f5",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.4)"
          }}
        >
        Recommendations
        </a>
      </div>
    </div>
  );
}
