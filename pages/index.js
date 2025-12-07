// pages/index.js
export default function HomePage() {
  const buttonStyle = {
    padding: "12px 24px",
    fontSize: "18px",
    borderRadius: "12px",
    backgroundColor: "#500000",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    margin: "10px",
    minWidth: "200px",
    transition: "0.2s",
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
    fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
  };

  return (
    <>
      {/* FIX WHITE BORDER */}
      <style jsx global>{`
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #000 !important;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-evenly",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          backgroundColor: "#000",
          color: "#fff",
          textAlign: "center",
          padding: "0",
          fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
        }}
      >
        {/* Logo */}
        <img
          src="/Images/ShareteaLogo.jpg"
          alt="Sharetea"
          style={{
            width: "320px",
            height: "auto",
            border: "4px solid white",
            borderRadius: "10px",
            boxShadow: "0 0 25px rgba(255,255,255,0.1)",
          }}
        />

        {/* Title */}
        <h1
          style={{
            fontSize: "40px",
            margin: "0",
            fontWeight: "600",
            letterSpacing: "1px",
          }}
        >
          Welcome to Sharetea
        </h1>

        {/* Subtitle */}
        <h2
          style={{
            fontSize: "22px",
            margin: "0",
            opacity: 0.9,
            fontWeight: "300",
          }}
        >
          Crafted with passion. Served with joy.
        </h2>

        {/* Buttons */}
        <div style={{ marginTop: "10px" }}>
          <a href="/kiosk" style={buttonStyle}>KIOSK</a>
          <a href="/auth/employee-access" style={buttonStyle}>CASHIER</a>
          <a href="/auth/manager-access" style={buttonStyle}>MANAGER</a>
          <a href="/kitchen" style={buttonStyle}>KITCHEN</a>
        </div>
      </div>
    </>
  );
}
