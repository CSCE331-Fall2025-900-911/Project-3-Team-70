import { useState, useEffect } from "react";

// === Narration helper ===
const speak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
};

// === Weather Widget ===
function WeatherWidget({ accessibilityMode }) {
  const [weather, setWeather] = useState({
    emoji: "☀️",
    temp: "--",
    feels_like: "--",
    wind: "--",
  });

  useEffect(() => {
    let intervalId;

    async function fetchWeather() {
      try {
        const res = await fetch("/api/weather");
        const data = await res.json();

        const kelvinToF = (k) => Math.round((k - 273.15) * 9/5 + 32);

        const iconMap = {
          "01d": "☀️",
          "01n": "🌙",
          "02d": "🌤️",
          "02n": "🌤️",
          "03d": "☁️",
          "03n": "☁️",
          "04d": "☁️",
          "04n": "☁️",
          "09d": "🌧️",
          "09n": "🌧️",
          "10d": "🌦️",
          "10n": "🌦️",
          "11d": "⛈️",
          "11n": "⛈️",
          "13d": "❄️",
          "13n": "❄️",
          "50d": "🌫️",
          "50n": "🌫️",
        };

        setWeather({
          emoji: iconMap[data.weather[0].icon] || "☀️",
          temp: kelvinToF(data.main.temp),
          feels_like: kelvinToF(data.main.feels_like),
          wind: data.wind.speed,
        });
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      }
    }

    fetchWeather();

    // Auto-refresh every 10 minutes
    intervalId = setInterval(fetchWeather, 600000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        backgroundColor: accessibilityMode ? "#222" : "#fff",
        color: accessibilityMode ? "#fff" : "#000",
        borderRadius: "12px",
        padding: "10px 15px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        textAlign: "center",
        fontSize: accessibilityMode ? "20px" : "16px",
        zIndex: 10,
        lineHeight: "1.4",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: accessibilityMode ? "28px" : "24px" }}>{weather.emoji}</div>
      <div style={{ fontWeight: "bold", marginTop: "2px" }}>{weather.temp}°F</div>
      <div>Feels like: {weather.feels_like}°F</div>
      <div>Wind: {weather.wind} mph</div>
    </div>
  );
}

// === Main Page ===
export default function KioskPage() {
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [narrationOn, setNarrationOn] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

useEffect(() => {
  async function fetchMenu() {
    try {
      const response = await fetch("/api/menu");
      const data = await response.json();

      const formatted = data.map((item) => {
        const id = item.menuid ?? item.id;
        return {
          id,
          name: item.menuname ?? item.name,
          price: item.price,
          description: item.menudescription ?? item.description,
          category: item.category,
          image: `/Images/${id}.png`, // lowercase, matches public/images
        };
      });

      setMenuItems(formatted);
    } catch (err) {
      console.error("Error fetching menu:", err);
      setError("Failed to load menu items.");
    } finally {
      setLoading(false);
    }
  }
  fetchMenu();
}, []);


  const handlePress = (item) => {
    setSelectedItem(item.id);
    if (narrationOn) {
      speak(`${item.name}. Price ${item.price} dollars. ${item.description || ""}`);
    }
    setTimeout(() => setSelectedItem(null), 300);
  };

  const toggleNarration = () => {
    const newState = !narrationOn;
    setNarrationOn(newState);
    if (newState) {
      speak("Narration enabled. Tap a drink to hear its description.");
    } else {
      speak("Narration disabled.");
    }
  };

  return (
    <div
      style={{
        textAlign: "center",
        backgroundColor: accessibilityMode ? "#000" : "#f4f4f4",
        color: accessibilityMode ? "#fff" : "#000",
        minHeight: "100vh",
        padding: accessibilityMode ? "40px" : "20px",
        position: "relative",
        touchAction: "manipulation",
        transition: "all 0.3s ease",
      }}
    >
      {/* === Weather Widget === */}
      <WeatherWidget accessibilityMode={accessibilityMode} />

      {/* === Left-Side Narration Button === */}
      <button
        onClick={toggleNarration}
        aria-label="Toggle narration mode"
        style={{
          position: "fixed",
          top: "30%",
          left: "20px",
          transform: "translateY(-50%)",
          backgroundColor: narrationOn
            ? "#FFD700"
            : accessibilityMode
            ? "#555"
            : "#500000",
          color: narrationOn ? "#000" : "#fff",
          border: "none",
          borderRadius: "50%",
          width: accessibilityMode ? "90px" : "70px",
          height: accessibilityMode ? "90px" : "70px",
          fontSize: accessibilityMode ? "36px" : "28px",
          cursor: "pointer",
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          zIndex: 10,
          transition: "all 0.25s ease",
        }}
      >
        🔊
      </button>

      {/* === Left-Side Translation Button === */}
      <button
        onClick={toggleNarration}
        aria-label="Toggle narration mode"
        style={{
          position: "fixed",
          top: "50%",
          left: "20px",
          transform: "translateY(-50%)",
          backgroundColor: narrationOn
            ? "#FFD700"
            : accessibilityMode
            ? "#555"
            : "#500000",
          color: narrationOn ? "#000" : "#fff",
          border: "none",
          borderRadius: "50%",
          width: accessibilityMode ? "90px" : "70px",
          height: accessibilityMode ? "90px" : "70px",
          fontSize: accessibilityMode ? "36px" : "28px",
          cursor: "pointer",
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          zIndex: 10,
          transition: "all 0.25s ease",
        }}
      >
        Para Espanol
      </button>

      {/* === Header === */}
      <h1
        tabIndex="0"
        aria-label="Welcome to Sharetea Self-Order Kiosk"
        style={{
          fontSize: accessibilityMode ? "48px" : "36px",
          marginBottom: accessibilityMode ? "30px" : "20px",
        }}
      >
        Sharetea Self-Order Kiosk
      </h1>
      <p
        style={{
          fontSize: accessibilityMode ? "24px" : "18px",
          marginBottom: accessibilityMode ? "30px" : "20px",
        }}
      >
        Welcome! Tap a drink to start your order.
      </p>

      {/* === Accessibility toggle === */}
      <button
        onClick={() => setAccessibilityMode(!accessibilityMode)}
        aria-pressed={accessibilityMode}
        aria-label="Toggle Accessibility Mode"
        style={{
          padding: accessibilityMode ? "18px 30px" : "10px 20px",
          fontSize: accessibilityMode ? "20px" : "18px",
          borderRadius: "10px",
          backgroundColor: accessibilityMode ? "#FFD700" : "#500000",
          color: accessibilityMode ? "#000" : "#fff",
          border: "none",
          cursor: "pointer",
          marginBottom: accessibilityMode ? "40px" : "25px",
          transition: "all 0.2s ease",
        }}
      >
        {accessibilityMode
          ? "Accessibility Mode: ON"
          : "Accessibility Mode: OFF"}
      </button>

      {/* === Loading or Error === */}
      {loading && <p>Loading menu...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* === Menu Grid === */}
      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: accessibilityMode
              ? "repeat(auto-fit, minmax(300px, 1fr))"
              : "repeat(auto-fit, minmax(220px, 1fr))",
            gap: accessibilityMode ? "40px" : "25px",
            maxWidth: accessibilityMode ? "1100px" : "900px",
            margin: "0 auto",
            transition: "all 0.3s ease",
          }}
        >
          {menuItems.map((item) => {
            const isPressed = selectedItem === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handlePress(item)}
                role="button"
                aria-label={`Select ${item.name}`}
                tabIndex="0"
                style={{
                  borderRadius: "20px",
                  padding: accessibilityMode ? "35px" : "25px",
                  backgroundColor: isPressed
                    ? "#ffe680"
                    : accessibilityMode
                    ? "#222"
                    : "#fff",
                  color: accessibilityMode ? "#fff" : "#000",
                  boxShadow: isPressed
                    ? "0 0 0 4px #FFD700"
                    : "0 4px 12px rgba(0,0,0,0.1)",
                  textAlign: "left",
                  transform: isPressed ? "scale(0.97)" : "scale(1)",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  onError={(e) => { e.target.src = "/Images/default.png"; }}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "15px",
                    marginBottom: "15px",
                  }}
                />
                <h2
                  style={{
                    fontSize: accessibilityMode ? "28px" : "22px",
                    marginBottom: "10px",
                  }}
                >
                  {item.name ?? item.menuname}
                </h2>
                <p
                  style={{
                    fontSize: accessibilityMode ? "22px" : "18px",
                    margin: "5px 0",
                  }}
                >
                  ${Number(item.price).toFixed(2)}
                </p>
                {(item.description ?? item.menudescription) && (
                  <p
                    style={{
                      fontSize: accessibilityMode ? "18px" : "14px",
                      opacity: "0.8",
                    }}
                  >
                    {item.description ?? item.menudescription}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
