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

        {/* Contact Information */}
        <div style={styles.contactContainer}>
        <div style={styles.contactLine}>
            <strong>Address:</strong> 1025 University Dr #105, College Station, TX 77840
        </div>
        <div style={styles.contactLine}>
            <strong>Phone:</strong> (979) 599-5010
        </div>
        <div style={styles.contactLine}>
        </div>
        </div>
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
    maxWidth: "750px",
    margin: "0 auto 30px auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",   // two columns
    gap: "16px",
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
    marginTop: "35px",
    padding: "22px 40px",     // bigger tap target
    fontSize: "26px",         // clearer for kiosk
    background: "#b80000",
    color: "white",
    border: "none",
    borderRadius: "16px",     // slightly larger rounding
    cursor: "pointer",
    width: "70%",             // wide button across screen
    maxWidth: "420px",        // prevents it from becoming too wide on large displays
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    transition: "0.15s ease",
  },
  loadingContainer: {
    textAlign: "center",
    marginTop: "100px"
  },
    contactContainer: {
    marginTop: "10px",
    marginBottom: "25px",
    fontSize: "16px",
    color: "#333",
    textAlign: "center",
    lineHeight: "1.4",
    },

    contactLine: {
    marginTop: "4px",
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

