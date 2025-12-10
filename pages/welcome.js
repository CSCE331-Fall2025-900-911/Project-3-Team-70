import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Welcome() {
  const [info, setInfo] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/reviews")
      .then(res => res.json())
      .then(data => setInfo(data))
      .catch(err => console.error("Failed to load reviews:", err));
  }, []);

  if (!info) {
    return (
      <div style={styles.loadingContainer}>
        <h2>Loading…</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div style={styles.mainLayout}>

        {/* LEFT COLUMN */}
        <div style={styles.leftColumn}>

          {/* LOGO */}
          <img
            src="/images/ShareteaLogo.jpg"
            alt="Sharetea"
            style={styles.logo}
          />

          {/* CONTACT INFO */}
          <div style={styles.contactContainer}>
            <div style={styles.contactLine}>
              <strong>Address:</strong> 1025 University Dr #105, College Station, TX 77840
            </div>
            <div style={styles.contactLine}>
              <strong>Phone:</strong> (979) 599-5010
            </div>
          </div>

          {/* RATING SUMMARY */}
          <div style={styles.rating}>
            ⭐ {info.rating} / 5 ({info.totalReviews} reviews)
          </div>

          {/* START ORDER BUTTON */}
          <button
            style={styles.orderButton}
            onMouseEnter={(e) => (e.target.style.background = "#664040")}
            onMouseLeave={(e) => (e.target.style.background = "#500000")}
            onClick={() => router.push("/kiosk")}
          >
            Start Order
          </button>
        </div>

        {/* RIGHT COLUMN — REVIEWS */}
        <div style={styles.rightColumn}>
          <h2 style={styles.reviewHeader}>Customer Reviews</h2>

          <div style={styles.reviewList}>
            {info.reviews.map((r, idx) => (
              <div key={idx} style={styles.reviewCard}>
                <div style={styles.reviewCardHeader}>
                  <strong>{r.author_name}</strong>
                  <span style={{ color: "#C49A00" }}>⭐ {r.rating}</span>
                </div>
                <p style={styles.reviewText}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

//
// =========================
// STYLES
// =========================
//

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f8f0d7ff",
    padding: "40px 20px",
    display: "flex",
    justifyContent: "center",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },

  mainLayout: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: "50px",
    width: "100%",
    maxWidth: "1200px",
  },

  leftColumn: {
    width: "40%",
    minWidth: "280px",
    textAlign: "center",
  },

  rightColumn: {
    width: "60%",
    minWidth: "320px",
  },

  // LOGO
  logo: {
    width: "200px",
    height: "auto",
    marginBottom: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
  },

  // CONTACT INFO
  contactContainer: {
    marginBottom: "25px",
    fontSize: "16px",
    color: "#500000",
    lineHeight: "1.5",
  },
  contactLine: {
    marginTop: "4px",
  },

  // RATING
  rating: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "25px",
    color: "#500000",
  },

  // START ORDER BUTTON
  orderButton: {
    padding: "40px 40px",     // doubled height
    fontSize: "28px",         // slightly larger text for high visibility
    backgroundColor: "#500000",
    color: "white",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    width: "100%",
    maxWidth: "350px",
    margin: "0 auto 20px auto",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    transition: "0.2s ease",
  },

  // Reviews header
  reviewHeader: {
    fontSize: "24px",
    marginBottom: "15px",
    color: "#500000",
  },

  // Review List — Single Column
  reviewList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  // Individual Review
  reviewCard: {
    background: "#fffaf0",
    padding: "16px",
    borderRadius: "10px",
    borderLeft: "6px solid #500000",
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
  },

  reviewCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    fontSize: "16px",
  },

  reviewText: {
    fontSize: "15px",
    lineHeight: "1.45",
    color: "#333",
  },

  loadingContainer: {
    textAlign: "center",
    marginTop: "80px",
  },
};
