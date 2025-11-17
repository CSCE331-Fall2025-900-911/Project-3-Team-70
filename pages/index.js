export default function HomePage() {
  // Shared button style
  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "18px",
    borderRadius: "10px",
    backgroundColor: "#500000",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    margin: "15px",
    minWidth: "200px",
    transition: "all 0.2s ease",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f4f4f4",
        color: "#000",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h1 style={{ fontSize: "36px", marginBottom: "30px" }}>
        HAIIIIII ヾ(≧▽≦*)o
      </h1>

      <h1 style={{ fontSize: "36px", marginBottom: "30px" }}>
        W-WELCOME TO MY PROJECT, END-USER-SENPAI (*/ω＼*)
      </h1>

      <h1 style={{ fontSize: "36px", marginBottom: "30px" }}>
        YOU CAN USE THE BUTTONS TO NAVIGATE TO OTHER PAGES DESU （〃｀ 3′〃）
      </h1>

      {/* Navigation Buttons */}
      <div>
        <a href="/kiosk" style={buttonStyle}>
          KIOSK
        </a>
        <a href="/cashier" style={buttonStyle}>
          CASHIER
        </a>
        <a href="/manager" style={buttonStyle}>
          MANAGER
        </a>
        <a href="/kitchen" style={buttonStyle}>
          KITCHEN
        </a>
      </div>
    </div>
  );
}
