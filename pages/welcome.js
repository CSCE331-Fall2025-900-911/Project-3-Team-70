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
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>

        <img
        src="/images/ShareteaLogo.jpg"
        alt="Sharetea"
        style={styles.logo}
        />
      <div style={styles.rating}>
        ⭐ {info.rating} / 5  ({info.totalReviews} reviews)
      </div>

      <div style={styles.reviewList}>
        {info.reviews.map((r, idx) => (
          <div key={idx} style={styles.reviewCard}>
            <div style={styles.reviewHeader}>
              <strong>{r.author_name}</strong>
              <span>⭐ {r.rating}</span>
            </div>
            <p style={styles.reviewText}>{r.text}</p>
          </div>
        ))}
      </div>

      <button 
        style={styles.orderButton}
        onClick={() => router.push("/kiosk")}
      >
        Start Order
      </button>
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    padding: "40px",
    minHeight: "100vh",
    backgroundColor: "#ffffff"
  },
  logo: {
    width: "260px",
    marginBottom: "20px"
  },
  rating: {
    fontSize: "26px",
    fontWeight: "bold",
    marginBottom: "25px"
  },
  reviewList: {
    maxWidth: "600px",
    margin: "0 auto 30px auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  reviewCard: {
    background: "#fafafa",
    padding: "14px",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    textAlign: "left"
  },
  reviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px"
  },
  reviewText: {
    fontSize: "15px",
    color: "#444"
  },
  orderButton: {
    marginTop: "25px",
    padding: "14px 30px",
    fontSize: "20px",
    background: "#b80000",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer"
  },
  loadingContainer: {
    textAlign: "center",
    marginTop: "100px"
  },
    logo: {
    width: "320px",
    height: "auto",
    border: "4px solid white",
    borderRadius: "10px",
    boxShadow: "0 0 25px rgba(255,255,255,0.1)",
    marginBottom: "20px",
    }
};

