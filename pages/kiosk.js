import { useState, useEffect } from "react";

// === Narration helper with language support ===
const narrationVoices = {
  en: "en-US",
  es: "es-ES",
  "zh-CN": "zh-CN",
  fr: "fr-FR",
  de: "de-DE",
  ja: "ja-JP",
  ru: "ru-RU",
  pt: "pt-PT",
  ar: "ar-SA",
  hi: "hi-IN",
};

const speak = (text, lang = "en") => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.lang = narrationVoices[lang] || "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
};

// === Translation helper ===
async function translateText(text, targetLang) {
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURI(
        text
      )}`
    );
    const result = await response.json();
    return result[0][0][0];
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}

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
  const [language, setLanguage] = useState("en");

  // ⭐ NEW — translated accessibility labels
  const [accessibilityLabel, setAccessibilityLabel] = useState({
    on: "Accessibility Mode: ON",
    off: "Accessibility Mode: OFF",
  });

  useEffect(() => {
    async function fetchMenu() {
      try {
        const response = await fetch("/api/menu");
        const data = await response.json();

        const formatted = data.map((item) => ({
          id: item.menuid ?? item.id,
          name: item.menuname ?? item.name,
          price: item.price,
          description: item.menudescription ?? item.description,
          category: item.category,
        }));

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

  // === Google Translate widget ===
  useEffect(() => {
    const addGoogleTranslateScript = () => {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
    };

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "google_translate_element"
      );
    };

    addGoogleTranslateScript();
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);
  }, []);

  // === Language selection ===
  async function handleLanguageChange(langCode) {
    if (!langCode) return;

    setLanguage(langCode);

    // ⭐ Translate accessibility label text
    const labelOn = await translateText("Accessibility Mode: ON", langCode);
    const labelOff = await translateText("Accessibility Mode: OFF", langCode);

    setAccessibilityLabel({
      on: labelOn,
      off: labelOff,
    });

    document.cookie = `googtrans=/en/${langCode};path=/`;
    window.location.reload();
  }

  const handlePress = (item) => {
    setSelectedItem(item.id);
    if (narrationOn) {
      speak(
        `${item.name}. Price ${item.price} dollars. ${item.description || ""}`,
        language
      );
    }
    setTimeout(() => setSelectedItem(null), 300);
  };

  const toggleNarration = () => {
    const newState = !narrationOn;
    setNarrationOn(newState);
    if (newState) {
      speak(
        "Narration enabled. Tap a drink to hear its description.",
        language
      );
    } else {
      speak("Narration disabled.", language);
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

      {/*Language Selector */}
      <div id="google_translate_element" style={{ display: "none" }}></div>
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 1000,
        }}
      >
        <select
          defaultValue=""
          onChange={(e) => handleLanguageChange(e.target.value)}
          style={{
            padding: "10px",
            fontSize: "16px",
            borderRadius: "8px",
            backgroundColor: "#fff",
            color: "#000",
            border: "1px solid #ccc",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          <option value="">Select Language</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="zh-CN">Chinese (Simplified)</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ja">Japanese</option>
          <option value="ru">Russian</option>
          <option value="pt">Portuguese</option>
          <option value="ar">Arabic</option>
          <option value="hi">Hindi</option>
        </select>
      </div>

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
        <span id="label-off" style={{ display: accessibilityMode ? "none" : "inline" }}>
          Accessibility Mode: OFF
        </span>

        <span id="label-on" style={{ display: accessibilityMode ? "inline" : "none" }}>
          Accessibility Mode: ON
        </span>
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
