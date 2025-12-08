// pages/kiosk.js
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

// === SEND ORDERS TO BACKEND (KIOSK) ===
async function sendOrderToSystem(orderItems, session) {
  const rawItems = Array.isArray(orderItems) ? orderItems : [];

  try {
    const items = rawItems.map((i) => ({
      menuID: i.id, // kiosk items store id
      quantity: 1,  // each customization is its own line
      priceAtPurchase: Number(i.finalPrice ?? i.price ?? 0),
      modifications: i.modifications || null,
    }));

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "kiosk",
        orderLocation: "Kiosk",
        customerEmail: session?.user?.email || null,
        items,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("Order submission failed:", data.error);
      alert("Sorry, we couldn't process your order. Please try again.");
      return null;
    }

    const data = await res.json();
    // Expecting { success, orderID, orderTotal }
    return {
      orderID: data.orderID,
      orderTotal: data.orderTotal,
    };
  } catch (err) {
    console.error("Error sending order:", err);
    alert("Sorry, we couldn't process your order. Please try again.");
    return null;
  }
}

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

        const kelvinToF = (k) =>
          Math.round(((k - 273.15) * 9) / 5 + 32);

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
    intervalId = setInterval(fetchWeather, 600000); // 10 min

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
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
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      <div style={{ fontSize: accessibilityMode ? "28px" : "24px" }}>
        {weather.emoji}
      </div>
      <div style={{ fontWeight: "bold", marginTop: "2px" }}>
        {weather.temp}°F
      </div>
      <div>Feels like: {weather.feels_like}°F</div>
      <div>Wind: {weather.wind} mph</div>
    </div>
  );
}

// === MAIN PAGE COMPONENT ===
export default function KioskPage() {
  const { data: session } = useSession();

  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [narrationOn, setNarrationOn] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [menuItems, setMenuItems] = useState([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [language, setLanguage] = useState("en");
  const [accessibilityLabel, setAccessibilityLabel] = useState({
    on: "Accessibility Mode: ON",
    off: "Accessibility Mode: OFF",
  });

  const [activeCategory, setActiveCategory] = useState(null);
  const [screen, setScreen] = useState("menu"); // menu | details | cart | checkout | payment | success
  const [detailsItem, setDetailsItem] = useState(null);

  const [cart, setCart] = useState([]);

  const [toppings, setToppings] = useState([]);
  const [toppingsError, setToppingsError] = useState(null);

  const [allergyFilterOpen, setAllergyFilterOpen] = useState(false);
  const [excludedAllergies, setExcludedAllergies] = useState([]);

  const [loyaltyPoints, setLoyaltyPoints] = useState(null);
  const [pointsError, setPointsError] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [lastOrderId, setLastOrderId] = useState(null);

  const categories = [
    "Ice-Blended",
    "Fruity Beverage",
    "Fresh Brew",
    "Milky Series",
    "Non-Caffeinated",
  ];

  // === HELPERS ===
  function filterByAllergies(items, excluded) {
    if (!excluded || excluded.length === 0) return items;

    return items.filter((item) => {
      if (!item.allergies || item.allergies.length === 0) return true;
      return !item.allergies.some((a) => excluded.includes(a));
    });
  }

  // === LOAD REWARDS WHEN SIGNED IN ===
  useEffect(() => {
    if (!session?.user?.email) {
      setLoyaltyPoints(null);
      setPointsToRedeem(0);
      return;
    }

    async function loadPoints() {
      try {
        const res = await fetch("/api/rewards");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setLoyaltyPoints(data.loyaltyPoints ?? 0);
        setPointsError(null);
      } catch (err) {
        console.error("Error loading rewards:", err);
        setPointsError("Could not load points");
      }
    }

    loadPoints();
  }, [session]);

  // === LOAD MENU ===
  useEffect(() => {
    async function fetchMenu() {
      try {
        const response = await fetch("/api/menu");
        const data = await response.json();

        const formatted = data.map((item) => {
          const id = item.menuid ?? item.id;
          return {
            id,
            name: item.menuname ?? item.name ?? "Unnamed item",
            price: Number(item.finalPrice ?? item.price ?? 0),
            description: item.menudescription ?? item.description ?? "",
            category: item.category ?? "Uncategorized",
            image: `/images/${id}.png`,
            allergies: item.allergies || [],
          };
        });

        setMenuItems(formatted);
        setFilteredMenuItems(filterByAllergies(formatted, excludedAllergies));
      } catch (err) {
        console.error("Error fetching menu:", err);
        setError("Failed to load menu items.");
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  // === LOAD TOPPINGS ===
  useEffect(() => {
    async function fetchToppings() {
      try {
        const res = await fetch("/api/toppings");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();

        const formatted = data.map((t) => ({
          id: t.inventoryID,
          name: t.inventoryName,
          price: Number(t.addOnPrice),
          allergy: t.allergy,
        }));

        setToppings(formatted);
      } catch (err) {
        console.error("Error loading toppings:", err);
        setToppingsError("Could not load toppings");
      }
    }
    fetchToppings();
  }, []);

  // === UPDATE FILTERED MENU WHEN ALLERGY SELECTION CHANGES ===
  useEffect(() => {
    setFilteredMenuItems(filterByAllergies(menuItems, excludedAllergies));
  }, [menuItems, excludedAllergies]);

  // === GOOGLE TRANSLATE WIDGET ===
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          layout:
            window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "google_translate_element"
      );
    };
  }, []);

  async function handleLanguageChange(langCode) {
    if (!langCode) return;
    setLanguage(langCode);

    const labelOn = await translateText(
      "Accessibility Mode: ON",
      langCode
    );
    const labelOff = await translateText(
      "Accessibility Mode: OFF",
      langCode
    );

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
        `${item.name}. Price ${item.finalPrice || item.price} dollars. ${
          item.description || ""
        }`,
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

  const addToCart = (item) => {
    setCart((prev) => [...prev, item]);
    if (narrationOn) {
      speak(`${item.name} added to cart.`, language);
    }
  };

  const removeFromCart = (indexToRemove) => {
    setCart((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.finalPrice ?? item.price ?? 0),
    0
  );

  // === DRINK DETAILS / CUSTOMIZATION SCREEN ===
  const DrinkDetailsPage = () => {
    const [selectedToppings, setSelectedToppings] = useState([]);
    const [sweetness, setSweetness] = useState("100%");
    const [iceLevel, setIceLevel] = useState("Regular Ice");
    const [temperature, setTemperature] = useState("Cold");
    const [size, setSize] = useState("Medium");

    if (!detailsItem) return null;

    const toggleTopping = (topping) => {
      setSelectedToppings((prev) =>
        prev.some((t) => t.id === topping.id)
          ? prev.filter((t) => t.id !== topping.id)
          : [...prev, topping]
      );
    };

    const basePrice =
      Number(detailsItem.price) +
      selectedToppings.reduce(
        (sum, t) => sum + Number(t.price),
        0
      );

    let finalPrice = basePrice;
    if (size === "Small") finalPrice -= 0.5;
    if (size === "Large") finalPrice += 0.5;

    const finalize = () => {
      const appliedIce =
        temperature === "Hot" ? "No Ice (Hot)" : iceLevel;

      const modifications = {
        toppings: selectedToppings.map((t) => t.name),
        size,
        sweetness,
        ice: appliedIce,
        temperature,
        finalPrice,
      };

      addToCart({
        ...detailsItem,
        toppings: selectedToppings,
        sweetness,
        iceLevel: appliedIce,
        temperature,
        size,
        finalPrice,
        modifications,
      });

      setScreen("menu");
    };

    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          backgroundColor: accessibilityMode ? "#000" : "#fff",
          color: accessibilityMode ? "#fff" : "#000",
          padding: "20px",
          textAlign: "center",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        <button
          onClick={() => setScreen("menu")}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            padding: "10px 20px",
            backgroundColor: "#500000",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <img
          src={detailsItem.image}
          alt={detailsItem.name}
          onError={(e) => {
            e.target.src = "/images/default.png";
          }}
          style={{
            width: "60%",
            maxWidth: "400px",
            borderRadius: "20px",
            marginTop: "60px",
            marginBottom: "20px",
          }}
        />

        <h1 style={{ fontSize: "36px" }}>{detailsItem.name}</h1>

        <p style={{ fontSize: "24px", opacity: 0.9 }}>
          Base Price: ${Number(detailsItem.price).toFixed(2)}
        </p>

        {/* TOPPINGS */}
        <h2 style={{ fontSize: "30px", marginTop: "20px" }}>
          Toppings
        </h2>

        <div
          style={{
            margin: "20px auto",
            width: "80%",
            textAlign: "left",
          }}
        >
          {toppingsError && (
            <p style={{ color: "red" }}>{toppingsError}</p>
          )}
          {toppings.map((top) => {
            const checked = selectedToppings.some(
              (t) => t.id === top.id
            );
            return (
              <div key={top.id} style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                    fontSize: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTopping(top)}
                      style={{ width: "20px", height: "20px" }}
                    />
                    {top.name}
                  </div>
                  <span>
                    + ${Number(top.price).toFixed(2)}
                  </span>
                </label>

                {top.allergy && top.allergy !== "None" && (
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "red",
                      marginTop: "5px",
                    }}
                  >
                    ⚠ Contains {top.allergy}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* TEMPERATURE */}
        <h2 style={{ marginTop: "20px" }}>Temperature</h2>
        <select
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          style={{
            padding: "10px",
            fontSize: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <option value="Cold">Cold</option>
          <option value="Hot">Hot</option>
        </select>

        {/* ICE LEVEL (only when Cold) */}
        {temperature === "Cold" && (
          <>
            <h2>Ice Level</h2>
            <select
              value={iceLevel}
              onChange={(e) => setIceLevel(e.target.value)}
              style={{
                padding: "10px",
                fontSize: "20px",
                borderRadius: "10px",
                marginBottom: "20px",
              }}
            >
              <option>Regular Ice</option>
              <option>Less Ice</option>
              <option>No Ice</option>
              <option>Extra Ice</option>
            </select>
          </>
        )}

        {/* SWEETNESS */}
        <h2 style={{ marginTop: "20px" }}>Sweetness</h2>
        <select
          value={sweetness}
          onChange={(e) => setSweetness(e.target.value)}
          style={{
            padding: "10px",
            fontSize: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <option>0%</option>
          <option>25%</option>
          <option>50%</option>
          <option>75%</option>
          <option>100%</option>
        </select>


        {/* SIZE */}
        <h2 style={{ marginTop: "20px" }}>Size</h2>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          style={{
            padding: "10px",
            fontSize: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <option value="Small">Small (-$0.50)</option>
          <option value="Medium">Medium</option>
          <option value="Large">Large (+$0.50)</option>
        </select>

        {/* FINAL TOTAL */}
        <h2 style={{ marginTop: "30px", fontSize: "30px" }}>
          Total: ${finalPrice.toFixed(2)}
        </h2>

        <button
          onClick={finalize}
          style={{
            padding: "20px 40px",
            backgroundColor: "#FFD700",
            border: "none",
            borderRadius: "15px",
            fontSize: "26px",
            cursor: "pointer",
            marginTop: "20px",
          }}
        >
          Add to Cart
        </button>
      </div>
    );
  };

  // === CART SCREEN ===
  const CartScreen = () => {
    useEffect(() => {
      if (narrationOn) {
        speak(
          "You are now on the cart page. Review your items.",
          language
        );
      }
    }, []);

    return (
      <div
        style={{
          padding: accessibilityMode ? "40px" : "20px",
          backgroundColor: accessibilityMode ? "#000" : "#fff",
          color: accessibilityMode ? "#fff" : "#000",
          minHeight: "100vh",
          transition: "all 0.3s ease",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        <h2 style={{ fontSize: accessibilityMode ? "48px" : "36px" }}>
          Your Cart
        </h2>

        {cart.length === 0 ? (
          <p style={{ fontSize: accessibilityMode ? "28px" : "22px" }}>
            Your cart is empty.
          </p>
        ) : (
          cart.map((item, index) => (
            <div
              key={index}
              style={{
                padding: accessibilityMode ? "25px" : "15px",
                margin: "15px 0",
                border: accessibilityMode
                  ? "2px solid #FFD700"
                  : "1px solid #ccc",
                borderRadius: "12px",
                fontSize: accessibilityMode ? "26px" : "20px",
                backgroundColor: accessibilityMode
                  ? "#111"
                  : "#fafafa",
                color: accessibilityMode ? "#fff" : "#000",
                position: "relative",
              }}
            >
              <button
                onClick={() => removeFromCart(index)}
                style={{
                  position: "absolute",
                  top: accessibilityMode ? "15px" : "10px",
                  right: accessibilityMode ? "15px" : "10px",
                  backgroundColor: "#b00000",
                  color: "white",
                  border: "none",
                  padding: accessibilityMode
                    ? "12px 18px"
                    : "8px 14px",
                  borderRadius: "8px",
                  fontSize: accessibilityMode ? "20px" : "16px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>

              <p
                style={{
                  fontSize: accessibilityMode ? "32px" : "24px",
                  fontWeight: "bold",
                  marginBottom: "10px",
                }}
              >
                {item.name} — $
                {Number(
                  item.finalPrice ?? item.price ?? 0
                ).toFixed(2)}
              </p>

              {item.temperature && (
                <p style={{ margin: "5px 0" }}>
                  <strong>Temp:</strong> {item.temperature}
                </p>
              )}

              {item.sweetness && (
                <p style={{ margin: "5px 0" }}>
                  <strong>Sweetness:</strong> {item.sweetness}
                </p>
              )}

              {item.iceLevel && (
                <p style={{ margin: "5px 0" }}>
                  <strong>Ice:</strong> {item.iceLevel}
                </p>
              )}

              {item.size && (
                <p style={{ margin: "5px 0" }}>
                  <strong>Size:</strong> {item.size}
                </p>
              )}

              {item.toppings && item.toppings.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <strong>Toppings:</strong>
                  <ul
                    style={{
                      marginLeft: "20px",
                      marginTop: "5px",
                    }}
                  >
                    {item.toppings.map((t, idx) => (
                      <li key={idx}>
                        {t.name} (+${t.price.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}

        {cart.length > 0 && (
          <h2
            style={{
              fontSize: accessibilityMode ? "40px" : "32px",
              marginTop: "30px",
              textAlign: "right",
              paddingRight: "10px",
            }}
          >
            Cart Total: ${cartTotal.toFixed(2)}
          </h2>
        )}

        <button
          onClick={() => setScreen("checkout")}
          disabled={cart.length === 0}
          style={{
            padding: accessibilityMode ? "28px 50px" : "20px 40px",
            backgroundColor: "#FFD700",
            border: "none",
            borderRadius: "10px",
            fontSize: accessibilityMode ? "32px" : "24px",
            marginTop: "20px",
            cursor: "pointer",
          }}
        >
          Proceed to Checkout
        </button>

        <button
          onClick={() => setScreen("menu")}
          style={{
            padding: accessibilityMode ? "22px 40px" : "15px 30px",
            backgroundColor: accessibilityMode ? "#555" : "#ccc",
            border: "none",
            borderRadius: "10px",
            fontSize: accessibilityMode ? "28px" : "20px",
            marginLeft: "20px",
            color: accessibilityMode ? "#fff" : "#000",
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </div>
    );
  };

  // === CHECKOUT SCREEN (loyalty points) ===
  const CheckoutScreen = () => {
    const total = cartTotal;

    const maxRedeemable =
      typeof loyaltyPoints === "number"
        ? Math.min(loyaltyPoints, Math.floor(total))
        : 0;

    const applied = Math.min(pointsToRedeem || 0, maxRedeemable);
    const finalTotal = total - applied;

    async function redeemPointsIfNeeded() {
      if (applied > 0 && session?.user?.email) {
        try {
          await fetch("/api/rewards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ points: applied }),
          });
        } catch (err) {
          console.error("Error applying rewards:", err);
        }
      }
    }

    return (
      <div
        style={{
          padding: accessibilityMode ? "40px" : "20px",
          backgroundColor: accessibilityMode ? "#000" : "#fff",
          color: accessibilityMode ? "#fff" : "#000",
          minHeight: "100vh",
          transition: "all 0.3s ease",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        <h2 style={{ fontSize: accessibilityMode ? "48px" : "36px" }}>
          Order Summary
        </h2>

        {cart.map((item, index) => (
          <div
            key={index}
            style={{
              fontSize: accessibilityMode ? "28px" : "22px",
              padding: "12px",
              margin: "10px 0",
              borderRadius: "10px",
              backgroundColor: accessibilityMode ? "#111" : "#f3f4f6",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div>
                {item.name} — $
                {Number(
                  item.finalPrice ?? item.price ?? 0
                ).toFixed(2)}
              </div>
              {item.temperature && (
                <div
                  style={{
                    fontSize: "16px",
                    opacity: 0.9,
                    marginTop: "4px",
                  }}
                >
                  Temp: {item.temperature}
                </div>
              )}
              {item.toppings && item.toppings.length > 0 && (
                <div
                  style={{
                    fontSize: "16px",
                    opacity: 0.8,
                    marginTop: "4px",
                  }}
                >
                  Toppings:{" "}
                  {item.toppings.map((t) => t.name).join(", ")}
                </div>
              )}
            </div>
            <button
              onClick={() => removeFromCart(index)}
              style={{
                padding: "8px 14px",
                backgroundColor: "#b91c1c",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        ))}

        {typeof loyaltyPoints === "number" && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: accessibilityMode ? "#222" : "#f3f4f6",
              color: accessibilityMode ? "#fff" : "#000",
            }}
          >
            <p>Available points: {loyaltyPoints}</p>
            <label>
              Apply points (max {maxRedeemable}):
              <input
                type="number"
                min="0"
                max={maxRedeemable}
                value={pointsToRedeem}
                onChange={(e) =>
                  setPointsToRedeem(
                    Math.max(
                      0,
                      Math.min(
                        maxRedeemable,
                        Number(e.target.value) || 0
                      )
                    )
                  )
                }
                style={{
                  marginLeft: "10px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  width: "80px",
                }}
              />
            </label>

            <p>Discount: ${applied.toFixed(2)}</p>
          </div>
        )}

        <h3
          style={{
            fontSize: "28px",
            marginTop: "20px",
            textAlign: "right",
          }}
        >
          Total: ${finalTotal.toFixed(2)}
        </h3>

        <button
          onClick={async () => {
            await redeemPointsIfNeeded();
            setScreen("payment");
          }}
          style={{
            padding: "20px 40px",
            backgroundColor: "#FFD700",
            border: "none",
            borderRadius: "10px",
            fontSize: "24px",
            marginTop: "20px",
            cursor: "pointer",
          }}
          disabled={cart.length === 0}
        >
          Continue to Payment
        </button>

        <button
          onClick={() => setScreen("cart")}
          style={{
            padding: "15px 30px",
            backgroundColor: "#ccc",
            borderRadius: "10px",
            border: "none",
            marginLeft: "20px",
          }}
        >
          Back
        </button>
      </div>
    );
  };

  // === PAYMENT SCREEN ===
  const PaymentScreen = () => {
    const [confirmMethod, setConfirmMethod] = useState(null);
    const paymentMethods = [
      "Card",
      "Tap to Pay",
      "Mobile Wallet",
      "Cash",
    ];

    const handlePayment = async () => {
      const result = await sendOrderToSystem(cart, session);
      if (!result) return;

      setLastOrderId(result.orderID || null);
      setCart([]);
      setPointsToRedeem(0);
      setScreen("success");
    };

    if (!accessibilityMode) {
      return (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#fff",
            minHeight: "100vh",
          }}
        >
          <h2 style={{ fontSize: "36px" }}>Payment</h2>

          <p style={{ fontSize: "22px" }}>
            Choose a payment method:
          </p>

          {paymentMethods.map((method) => (
            <button
              key={method}
              onClick={handlePayment}
              style={{
                display: "block",
                width: "80%",
                padding: "20px",
                margin: "10px auto",
                backgroundColor: "#500000",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "24px",
                fontFamily:
                  "'Helvetica Neue', Helvetica, Arial, sans-serif",
              }}
            >
              {method}
            </button>
          ))}

          <button
            onClick={() => setScreen("checkout")}
            style={{
              padding: "15px 30px",
              backgroundColor: "#ccc",
              borderRadius: "10px",
              border: "none",
              fontSize: "20px",
              marginTop: "20px",
            }}
          >
            Back
          </button>
        </div>
      );
    }

    // Accessibility mode: double-tap confirm
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          backgroundColor: "#000",
          color: "#fff",
          minHeight: "100vh",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        <h2 style={{ fontSize: "44px" }}>Payment</h2>

        <p
          style={{
            fontSize: "28px",
            marginBottom: "30px",
          }}
        >
          Choose a method:
        </p>

        {paymentMethods.map((method) => (
          <button
            key={method}
            onClick={() => {
              if (narrationOn) speak(method, language);

              if (confirmMethod !== method) {
                setConfirmMethod(method);
                return;
              }

              handlePayment();
            }}
            style={{
              width: "90%",
              padding: "30px",
              margin: "20px auto",
              display: "block",
              backgroundColor:
                confirmMethod === method ? "#FFD700" : "#500000",
              color: confirmMethod === method ? "#000" : "#fff",
              border: "none",
              borderRadius: "14px",
              fontSize: "32px",
              cursor: "pointer",
            }}
          >
            {method}
            {confirmMethod === method && (
              <div
                style={{
                  fontSize: "16px",
                  marginTop: "6px",
                  opacity: 0.8,
                }}
              >
                Tap again to confirm
              </div>
            )}
          </button>
        ))}

        <button
          onClick={() => setScreen("checkout")}
          style={{
            marginTop: "25px",
            padding: "22px 40px",
            backgroundColor: "#ccc",
            borderRadius: "10px",
            border: "none",
            fontSize: "24px",
            width: "70%",
            color: "#000",
          }}
        >
          Back
        </button>
      </div>
    );
  };

  // === SUCCESS SCREEN ===
  const SuccessScreen = () => (
    <div
      style={{
        padding: "40px",
        textAlign: "center",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "48px" }}>Payment Successful!</h1>
      <p style={{ fontSize: "24px", marginTop: "20px" }}>
        Thank you for your order.
      </p>
      {lastOrderId && (
        <p style={{ fontSize: "20px", marginTop: "10px" }}>
          Your Order ID: <strong>{lastOrderId}</strong>
        </p>
      )}

      <button
        onClick={() => {
          setScreen("menu");
        }}
        style={{
          padding: "20px 40px",
          backgroundColor: "#FFD700",
          border: "none",
          borderRadius: "10px",
          fontSize: "24px",
          marginTop: "30px",
          cursor: "pointer",
        }}
      >
        Done
      </button>
    </div>
  );

  // === ALLERGY FILTER MODAL ===
  const AllergyFilterPanel = () => {
    const allergens = ["Dairy", "Nuts", "Soy", "Gluten"];

    const toggleAllergen = (a) => {
      setExcludedAllergies((prev) =>
        prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
      );
    };

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.75)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            backgroundColor: "#fff",
            padding: "30px",
            borderRadius: "14px",
            width: "90%",
            maxWidth: "400px",
            textAlign: "center",
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          }}
        >
          <h2 style={{ marginBottom: "20px" }}>
            Select Allergies to Avoid
          </h2>

          {allergens.map((a) => (
            <label
              key={a}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: "1px solid #ddd",
                fontSize: "18px",
              }}
            >
              <span>{a}</span>
              <input
                type="checkbox"
                checked={excludedAllergies.includes(a)}
                onChange={() => toggleAllergen(a)}
              />
            </label>
          ))}

          <button
            onClick={() => setAllergyFilterOpen(false)}
            style={{
              marginTop: "20px",
              padding: "12px 20px",
              backgroundColor: "#500000",
              color: "#fff",
              borderRadius: "10px",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    );
  };

  // === RENDER SCREEN SWITCH ===
  if (screen === "details") {
    return <DrinkDetailsPage />;
  }

  if (screen === "cart") {
    return (
      <CartScreen />
    );
  }

  if (screen === "checkout") {
    return <CheckoutScreen />;
  }

  if (screen === "payment") {
    return <PaymentScreen />;
  }

  if (screen === "success") {
    return <SuccessScreen />;
  }

  // === MAIN MENU SCREEN ===
  return (
    <div
      style={{
        textAlign: "center",
        backgroundColor: accessibilityMode ? "#000" : "#f8f0d7ff",
        color: accessibilityMode ? "#fff" : "#000",
        minHeight: "100vh",
        padding: accessibilityMode ? "40px" : "20px",
        position: "relative",
        touchAction: "manipulation",
        transition: "all 0.3s ease",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      <WeatherWidget accessibilityMode={accessibilityMode} />
      {allergyFilterOpen && <AllergyFilterPanel />}

      {/* Rewards sign-in / status */}
      <div
        style={{
          position: "absolute",
          top: accessibilityMode ? "28px" : "20px",
          right: accessibilityMode ? "240px" : "200px",
          backgroundColor: accessibilityMode ? "#111" : "#ffffff",
          color: accessibilityMode ? "#fff" : "#000",
          borderRadius: "12px",
          padding: accessibilityMode ? "12px 16px" : "8px 12px",
          boxShadow: accessibilityMode
            ? "none"
            : "0 2px 8px rgba(0,0,0,0.2)",
          fontSize: accessibilityMode ? "18px" : "14px",
          display: "flex",
          alignItems: "center",
          gap: accessibilityMode ? "12px" : "8px",
          zIndex: 12,
          transition: "all 0.3s ease",
        }}
      >
        {!session ? (
          <>
            <span>Sign in for rewards:</span>
            <button
              onClick={() =>
                signIn("google", { callbackUrl: "/kiosk" })
              }
              style={{
                padding: accessibilityMode ? "10px 16px" : "6px 10px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: accessibilityMode
                  ? "#b00000"
                  : "#500000",
                color: "#fff",
                cursor: "pointer",
                fontSize: accessibilityMode ? "18px" : "14px",
                fontWeight: "bold",
              }}
            >
              Sign in
            </button>
          </>
        ) : (
          <span>
            Signed in as {session.user.email}
            {typeof loyaltyPoints === "number" && (
              <> · Points: {loyaltyPoints}</>
            )}
            {pointsError && (
              <>
                {" "}
                ·{" "}
                <span style={{ color: "red" }}>
                  Points unavailable
                </span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Narration toggle */}
      <button
        onClick={toggleNarration}
        aria-label="Toggle narration mode"
        style={{
          position: "absolute",
          top: "125px",
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

      <div id="google_translate_element" style={{ display: "none" }} />

      {/* Language selector */}
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

      {/* Accessibility + allergy buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: accessibilityMode ? "25px" : "15px",
          marginBottom: accessibilityMode ? "40px" : "25px",
        }}
      >
        <button
          onClick={() => setAccessibilityMode(!accessibilityMode)}
          aria-pressed={accessibilityMode}
          aria-label="Toggle Accessibility Mode"
          style={{
            padding: accessibilityMode ? "18px 30px" : "10px 20px",
            fontSize: accessibilityMode ? "20px" : "18px",
            borderRadius: "10px",
            backgroundColor: accessibilityMode
              ? "#FFD700"
              : "#500000",
            color: accessibilityMode ? "#000" : "#fff",
            border: "none",
            cursor: "pointer",
            width: "220px",
            transition: "all 0.2s ease",
          }}
        >
          {accessibilityMode
            ? accessibilityLabel.on
            : accessibilityLabel.off}
        </button>

        <button
          onClick={() => setAllergyFilterOpen(true)}
          aria-label="Open Allergy Filter"
          style={{
            padding: accessibilityMode ? "18px 30px" : "10px 20px",
            fontSize: accessibilityMode ? "20px" : "18px",
            borderRadius: "10px",
            backgroundColor: accessibilityMode
              ? "#FFD700"
              : "#800000",
            color: accessibilityMode ? "#000" : "#fff",
            border: "none",
            cursor: "pointer",
            width: "220px",
            transition: "all 0.2s ease",
          }}
        >
          Allergy Filter
        </button>
      </div>

      {loading && <p>Loading menu...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && screen === "menu" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {categories.map((cat) => {
            const sampleItem = menuItems.find(
              (item) => item.category === cat
            );
            return (
              <div key={cat}>
                <button
                  onClick={() =>
                    setActiveCategory(
                      activeCategory === cat ? null : cat
                    )
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    padding: "20px",
                    borderRadius: "12px",
                    backgroundColor:
                      activeCategory === cat
                        ? "#FFD700"
                        : "#500000",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontSize: accessibilityMode ? "28px" : "24px",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  {sampleItem && (
                    <img
                      src={sampleItem.image}
                      alt={cat}
                      onError={(e) => {
                        e.target.src = "/images/default.png";
                      }}
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        marginRight: "20px",
                      }}
                    />
                  )}
                  <span>{cat}</span>
                </button>

                {activeCategory === cat && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(220px, 1fr))",
                      justifyItems: "center",
                      gap: accessibilityMode ? "40px" : "25px",
                      marginTop: "20px",
                      marginBottom: "30px",
                    }}
                  >
                    {filteredMenuItems
                      .filter((item) => item.category === cat)
                      .map((item) => {
                        const isPressed =
                          selectedItem === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              handlePress(item);
                              setDetailsItem(item);
                              setScreen("details");
                            }}
                            role="button"
                            aria-label={`Select ${item.name}`}
                            tabIndex="0"
                            style={{
                              borderRadius: "20px",
                              padding: accessibilityMode
                                ? "35px"
                                : "25px",
                              backgroundColor: isPressed
                                ? "#ffe680"
                                : accessibilityMode
                                ? "#222"
                                : "#fff",
                              color: accessibilityMode
                                ? "#fff"
                                : "#000",
                              boxShadow: isPressed
                                ? "0 0 0 4px #FFD700"
                                : "0 4px 12px rgba(0,0,0,0.1)",
                              textAlign: "left",
                              transform: isPressed
                                ? "scale(0.97)"
                                : "scale(1)",
                              transition: "all 0.2s ease",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            <div
                              style={{
                                width: "100%",
                                height: "180px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                overflow: "hidden",
                                backgroundColor: "#f5f5f5",
                                borderRadius: "15px",
                                marginBottom: "15px",
                              }}
                            >
                              <img
                                src={item.image}
                                alt={item.name}
                                onError={(e) => {
                                  e.target.src =
                                    "/images/default.png";
                                }}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            </div>

                            <h3
                              style={{
                                fontSize: accessibilityMode
                                  ? "28px"
                                  : "22px",
                                marginBottom: "10px",
                              }}
                            >
                              {item.name}
                            </h3>
                            <p
                              style={{
                                fontSize: accessibilityMode
                                  ? "22px"
                                  : "18px",
                              }}
                            >
                              $
                              {Number(
                                item.finalPrice ?? item.price ?? 0
                              ).toFixed(2)}
                            </p>
                            {item.description && (
                              <p
                                style={{
                                  fontSize: accessibilityMode
                                    ? "18px"
                                    : "14px",
                                  opacity: 0.8,
                                }}
                              >
                                {item.description}
                              </p>
                            )}

                            {/* Allergy icons */}
                            {item.allergies &&
                              item.allergies.length > 0 && (
                                <div
                                  style={{
                                    marginTop: "10px",
                                    display: "flex",
                                    gap: "8px",
                                  }}
                                >
                                  {item.allergies.includes(
                                    "Dairy"
                                  ) && (
                                    <span
                                      style={{
                                        fontSize: "20px",
                                      }}
                                    >
                                      🥛
                                    </span>
                                  )}
                                  {item.allergies.includes(
                                    "Nuts"
                                  ) && (
                                    <span
                                      style={{
                                        fontSize: "20px",
                                      }}
                                    >
                                      🥜
                                    </span>
                                  )}
                                  {item.allergies.includes(
                                    "Soy"
                                  ) && (
                                    <span
                                      style={{
                                        fontSize: "20px",
                                      }}
                                    >
                                      🌱
                                    </span>
                                  )}
                                  {item.allergies.includes(
                                    "Gluten"
                                  ) && (
                                    <span
                                      style={{
                                        fontSize: "20px",
                                      }}
                                    >
                                      🌾
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating cart button */}
      {screen === "menu" && cart.length > 0 && (
        <button
          onClick={() => setScreen("cart")}
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            backgroundColor: "#FFD700",
            color: "#fff",
            borderRadius: "50%",
            width: "90px",
            height: "90px",
            fontSize: "32px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            cursor: "pointer",
            zIndex: 2000,
          }}
        >
          🛒 {cart.length}
        </button>
      )}

      {/* Back to main home */}
      <button
        onClick={() => {
          window.location.href = "/";
        }}
        style={{
          position: "absolute",
          top: "200px",
          left: "20px",
          padding: "16px 24px",
          backgroundColor: "#500000",
          color: "#fff",
          borderRadius: "999px",
          border: "none",
          fontSize: "20px",
          fontWeight: "600",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          cursor: "pointer",
          zIndex: 2000,
        }}
      >
        ← Back
      </button>
    </div>
  );
}
