// pages/kiosk.js
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { QRCodeCanvas } from "qrcode.react";

// Texas state sales tax: 6.25%
const TAX_RATE = 0.0625;

// === SEND ORDERS TO BACKEND (DB-backed orderID) ===
async function sendOrderToSystem(
  cart,
  source = "kiosk",
  orderLocation = "Kiosk",
  customerEmail = null,
  summary = null
) {
  try {
    if (!cart || cart.length === 0) return null;

    const items = cart.map((item) => ({
      menuID: item.id,
      quantity: item.quantity || 1,
      priceAtPurchase: Number(item.finalPrice || item.price || 0),
      size: item.size ?? null,
    }));

    // Fallback if no summary provided
    const fallbackSubtotal = items.reduce(
      (sum, item) =>
        sum +
        Number(item.priceAtPurchase || 0) * Number(item.quantity || 0),
      0
    );

    const orderSubtotal = summary?.subtotal ?? fallbackSubtotal;
    const discountAmount = summary?.discount ?? 0;
    const taxAmount =
      summary?.tax ??
      Number(
        ((orderSubtotal - discountAmount) * TAX_RATE).toFixed(2)
      );
    const finalTotal =
      summary?.total ??
      Number(
        (orderSubtotal - discountAmount + taxAmount).toFixed(2)
      );

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        orderLocation,
        customerEmail,
        items,
        orderSubtotal,
        taxAmount,
        discountAmount,
        finalTotal,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("Order submission failed:", data.error);
      alert("Sorry, we couldn't process your order. Please try again.");
      return null;
    }

    const data = await res.json();
    return {
      orderID: data.orderID,
      orderTotal: data.orderTotal,
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
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
    intervalId = setInterval(fetchWeather, 600000);

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

// === Main Page ===
export default function KioskPage() {
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [narrationOn, setNarrationOn] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState("en");
  const [activeCategory, setActiveCategory] = useState(null);

  const [lastOrderId, setLastOrderId] = useState(null);

  const [screen, setScreen] = useState("menu");
  const [detailsItem, setDetailsItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [toppingsError, setToppingsError] = useState(null);

  const [allergyFilterOpen, setAllergyFilterOpen] = useState(false);
  const [excludedAllergies, setExcludedAllergies] = useState([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);

  const { data: session } = useSession();

  const [loyaltyPoints, setLoyaltyPoints] = useState(null);
  const [pointsError, setPointsError] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    pointsSpent: 0,
  });
  const [lastPointsSummary, setLastPointsSummary] = useState(null);

  const categories = [
    "Ice-Blended",
    "Fruity Beverage",
    "Fresh Brew",
    "Milky Series",
    "Non-Caffeinated",
  ];

  const [accessibilityLabel, setAccessibilityLabel] = useState({
    on: "Accessibility Mode: ON",
    off: "Accessibility Mode: OFF",
  });

  function filterByAllergies(items, excludedAllergies) {
    if (excludedAllergies.length === 0) return items;

    return items.filter((item) => {
      if (!item.allergies || item.allergies.length === 0) return true;
      return !item.allergies.some((a) => excludedAllergies.includes(a));
    });
  }

  useEffect(() => {
    const newFiltered = filterByAllergies(menuItems, excludedAllergies);
    setFilteredMenuItems(newFiltered);
  }, [menuItems, excludedAllergies]);

  // Load rewards points for logged-in customers
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

  // Load menu from DB
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
            price: item.finalPrice || item.price,
            description: item.menudescription ?? item.description,
            category: item.category,
            image: `/images/${id}.png`,
            allergies: item.allergies || [],
          };
        });

        setMenuItems(formatted);
        setFilteredMenuItems(formatted);
      } catch (err) {
        console.error("Error fetching menu:", err);
        setError("Failed to load menu items.");
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  // Load toppings from DB (/api/toppings)
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

  // language widget
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
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
    setCart((prev) => [...prev, { ...item, quantity: 1 }]);
    if (narrationOn) {
      speak(`${item.name} added to cart.`, language);
    }
  };

  // === CUSTOMIZATION UI ===
  const DrinkDetailsPage = () => {
    const [selectedToppings, setSelectedToppings] = useState([]);
    const [sweetness, setSweetness] = useState("100%");
    const [iceLevel, setIceLevel] = useState("Regular Ice");
    const [size, setSize] = useState("Medium");
    const [temperature, setTemperature] = useState("Cold");

    if (!detailsItem) return null;

    const toggleTopping = (topping) => {
      setSelectedToppings((prev) =>
        prev.some((t) => t.id === topping.id)
          ? prev.filter((t) => t.id !== topping.id)
          : [...prev, topping]
      );
    };

    const totalPrice =
      Number(detailsItem.price) +
      selectedToppings.reduce((sum, t) => sum + Number(t.price), 0);

    let finalPrice = totalPrice;
    if (size === "Small") finalPrice -= 0.5;
    if (size === "Large") finalPrice += 0.5;

    const finalize = () => {
      addToCart({
        ...detailsItem,
        toppings: selectedToppings,
        sweetness,
        iceLevel,
        temperature,
        size,
        finalPrice,
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
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
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
            width: "80%",
            margin: "0 auto",
            marginBottom: "40px",
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          }}
        >
          {detailsItem.description}
        </div>

        {/* Toppings selection */}
        {toppings.length > 0 && (
          <div
            style={{
              margin: "20px auto",
              width: "80%",
              textAlign: "left",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          >
            <h3
              style={{ fontSize: "24px", marginBottom: "10px" }}
            >
              Customize your drink
            </h3>

            {toppings.map((top) => {
              const checked = selectedToppings.some(
                (t) => t.id === top.id
              );

              const hasAllergen =
                top.allergy &&
                top.allergy.trim() !== "" &&
                top.allergy.trim().toLowerCase() !== "none";

              const cleanAllergies = hasAllergen
                ? top.allergy
                    .split(",")
                    .map((a) => a.trim())
                    .filter(
                      (a) => a && a.toLowerCase() !== "none"
                    )
                : [];

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
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: accessibilityMode
                          ? "26px"
                          : "20px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTopping(top)}
                        style={{
                          width: "25px",
                          height: "25px",
                        }}
                      />
                      {top.name}
                    </label>

                    <span
                      style={{
                        fontSize: accessibilityMode
                          ? "22px"
                          : "18px",
                      }}
                    >
                      + ${Number(top.price).toFixed(2)}
                    </span>
                  </label>

                  {cleanAllergies.length > 0 && (
                    <p
                      style={{
                        fontSize: accessibilityMode
                          ? "22px"
                          : "16px",
                        fontWeight: "bold",
                        color: "red",
                        marginTop: "5px",
                      }}
                    >
                      ⚠ Contains {cleanAllergies.join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SWEETNESS */}
        <h2 style={{ marginTop: "30px" }}>Sweetness</h2>
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
              onChange={(e) =>
                setIceLevel(e.target.value)
              }
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
        <h2
          style={{ marginTop: "30px", fontSize: "30px" }}
        >
          Price per drink: ${finalPrice.toFixed(2)}
        </h2>

        <button
          onClick={finalize}
          style={{
            padding: "20px 40px",
            backgroundColor: "#FFD700",
            color: "#000",
            border: "none",
            borderRadius: "15px",
            fontSize: "26px",
            cursor: "pointer",
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          }}
        >
          Add to Cart
        </button>
      </div>
    );
  };

  // === CART / CHECKOUT SCREEN WITH QUANTITY + POINT REDEMPTION ===
  const CartScreen = () => {
    // Narrate upon entering the cart page
    useEffect(() => {
      if (narrationOn) {
        speak(
          "You are now on the cart page. Review your items.",
          language
        );
      }
    }, [narrationOn, language]);

    const removeItem = (indexToRemove) => {
      setCart((prev) => prev.filter((_, i) => i !== indexToRemove));
    };

    const updateQuantity = (index, newQty) => {
      if (newQty < 1) newQty = 1;
      setCart((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, quantity: newQty } : item
        )
      );
    };

    // Subtotal (no discounts yet), respecting quantity
    const cartSubtotal = cart.reduce(
      (sum, item) =>
        sum +
        Number(item.finalPrice || item.price || 0) *
          Number(item.quantity || 1),
      0
    );

    // 1 point = $1 discount
    const maxRedeemable =
      session?.user?.email && typeof loyaltyPoints === "number"
        ? Math.min(loyaltyPoints, Math.floor(cartSubtotal))
        : 0;

    const applied = Math.min(
      Number(pointsToRedeem || 0),
      maxRedeemable
    );

    // Tax after discount
    const taxable = Math.max(cartSubtotal - applied, 0);
    const taxAmount = Number((taxable * TAX_RATE).toFixed(2));
    const finalTotal = Number(
      (taxable + taxAmount).toFixed(2)
    );

    // Keep a summary ready for payment & receipt
    useEffect(() => {
      setOrderSummary({
        subtotal: Number(cartSubtotal.toFixed(2)),
        discount: applied,
        tax: taxAmount,
        total: finalTotal,
        pointsSpent: applied,
      });
    }, [cartSubtotal, applied, taxAmount, finalTotal]);

    // helper for changing points nicely
    const changePointsBy = (delta) => {
      let val = Number(pointsToRedeem || 0) + delta;
      if (val < 0) val = 0;
      if (val > maxRedeemable) val = maxRedeemable;
      setPointsToRedeem(val);
    };

    return (
      <div
        style={{
          padding: accessibilityMode ? "40px" : "20px",
          backgroundColor: accessibilityMode ? "#000" : "#fff",
          color: accessibilityMode ? "#fff" : "#000",
          minHeight: "100vh",
          transition: "all 0.3s ease",
          pointerEvents: "auto",
        }}
      >
        <h2
          style={{
            fontSize: accessibilityMode ? "48px" : "36px",
          }}
        >
          Your Cart
        </h2>

        {cart.length === 0 ? (
          <p
            style={{
              fontSize: accessibilityMode ? "28px" : "22px",
            }}
          >
            Your cart is empty.
          </p>
        ) : (
          cart.map((item, index) => {
            const lineTotal =
              Number(item.finalPrice || item.price || 0) *
              Number(item.quantity || 1);

            return (
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
                  onClick={() => removeItem(index)}
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
                    marginTop: "10px",
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
                  {item.name}
                </p>

                <p style={{ margin: "5px 0" }}>
                  <strong>Price per drink:</strong> $
                  {Number(
                    item.finalPrice || item.price || 0
                  ).toFixed(2)}
                </p>

                {/* Quantity controls */}
                <p style={{ margin: "5px 0" }}>
                  <strong>Quantity:</strong>{" "}
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        index,
                        Number(item.quantity || 1) - 1
                      )
                    }
                    style={{
                      marginRight: "8px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    -
                  </button>
                  <span style={{ margin: "0 8px" }}>
                    {item.quantity || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        index,
                        Number(item.quantity || 1) + 1
                      )
                    }
                    style={{
                      marginLeft: "8px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                </p>

                {item.sweetness && (
                  <p style={{ margin: "5px 0" }}>
                    <strong>Sweetness:</strong>{" "}
                    {item.sweetness}
                  </p>
                )}
                {item.temperature && (
                  <p style={{ margin: "5px 0" }}>
                    <strong>Temperature:</strong>{" "}
                    {item.temperature}
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
                          {t.name} (+$
                          {Number(t.price).toFixed(2)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p
                  style={{
                    marginTop: "8px",
                    fontWeight: "bold",
                  }}
                >
                  Line total: ${lineTotal.toFixed(2)}
                </p>
              </div>
            );
          })
        )}

        {cart.length > 0 && (
          <>
            {/* Subtotal */}
            <h2
              style={{
                fontSize: accessibilityMode ? "36px" : "28px",
                marginTop: "20px",
                textAlign: "right",
                paddingRight: "10px",
              }}
            >
              Subtotal: ${cartSubtotal.toFixed(2)}
            </h2>

            {/* Loyalty points section */}
            {session?.user?.email &&
              typeof loyaltyPoints === "number" &&
              loyaltyPoints > 0 && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "16px",
                    borderRadius: "10px",
                    backgroundColor: accessibilityMode
                      ? "#111"
                      : "#f0f0f0",
                    fontSize: accessibilityMode ? "22px" : "16px",
                  }}
                >
                  <div style={{ marginBottom: "10px" }}>
                    You have{" "}
                    <strong>{loyaltyPoints}</strong> points.
                    <br />
                    <span
                      style={{
                        fontSize: accessibilityMode
                          ? "18px"
                          : "14px",
                        color: "#555",
                      }}
                    >
                      (1 point = $1.00 off, up to the order
                      amount)
                    </span>
                  </div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Points to redeem:
                  </label>

                  {/* BIGGER POINTS CONTROL */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: accessibilityMode ? "16px" : "10px",
                      marginBottom: "12px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => changePointsBy(-1)}
                      style={{
                        width: accessibilityMode ? "70px" : "56px",
                        height: accessibilityMode ? "70px" : "56px",
                        borderRadius: "50%",
                        border: "none",
                        fontSize: accessibilityMode ? "32px" : "26px",
                        fontWeight: "bold",
                        backgroundColor: "#500000",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      −
                    </button>

                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={maxRedeemable}
                      value={pointsToRedeem}
                      onChange={(e) => {
                        let val = Number(e.target.value) || 0;
                        if (val < 0) val = 0;
                        if (val > maxRedeemable)
                          val = maxRedeemable;
                        setPointsToRedeem(val);
                      }}
                      style={{
                        flex: "0 0 140px",
                        textAlign: "center",
                        padding: accessibilityMode ? "12px" : "8px",
                        borderRadius: "10px",
                        border: "1px solid #ccc",
                        fontSize: accessibilityMode ? "26px" : "20px",
                        height: accessibilityMode ? "60px" : "48px",
                        backgroundColor: "#fff",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => changePointsBy(1)}
                      style={{
                        width: accessibilityMode ? "70px" : "56px",
                        height: accessibilityMode ? "70px" : "56px",
                        borderRadius: "50%",
                        border: "none",
                        fontSize: accessibilityMode ? "32px" : "26px",
                        fontWeight: "bold",
                        backgroundColor: "#500000",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: accessibilityMode
                        ? "18px"
                        : "14px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setPointsToRedeem(maxRedeemable)
                      }
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#500000",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Use max
                    </button>
                    <button
                      type="button"
                      onClick={() => setPointsToRedeem(0)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#ccc",
                        color: "#000",
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  {applied > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: accessibilityMode
                          ? "20px"
                          : "16px",
                      }}
                    >
                      Discount:{" "}
                      <strong>
                        -${applied.toFixed(2)} ({applied} points)
                      </strong>
                    </div>
                  )}
                </div>
              )}

            {/* Tax + Total */}
            <h3
              style={{
                fontSize: accessibilityMode ? "30px" : "22px",
                marginTop: "10px",
                textAlign: "right",
                paddingRight: "10px",
              }}
            >
              Tax (6.25%): ${taxAmount.toFixed(2)}
            </h3>

            <h2
              style={{
                fontSize: accessibilityMode ? "40px" : "32px",
                marginTop: "10px",
                textAlign: "right",
                paddingRight: "10px",
              }}
            >
              Total: ${finalTotal.toFixed(2)}
            </h2>
          </>
        )}

        <button
          type="button"
          onClick={() => setScreen("payment")}
          disabled={cart.length === 0}
          style={{
            padding: accessibilityMode ? "28px 50px" : "20px 40px",
            backgroundColor: "#FFD700",
            border: "none",
            borderRadius: "10px",
            fontSize: accessibilityMode ? "32px" : "24px",
            marginTop: "20px",
            cursor:
              cart.length === 0 ? "not-allowed" : "pointer",
            opacity: cart.length === 0 ? 0.6 : 1,
            fontFamily:
              "'Helvetica Neue', Helvetica, Arial, sans-serif",
          }}
        >
          Proceed to Payment
        </button>

        <button
          type="button"
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
            fontFamily:
              "'Helvetica Neue', Helvetica, Arial, sans-serif",
          }}
        >
          Back
        </button>
      </div>
    );
  };

  // === PAYMENT SCREEN WITH POINTS + TAX AWARENESS ===
  const PaymentScreen = ({ accessibilityMode }) => {
    const [confirmMethod, setConfirmMethod] = useState(null);
    const paymentMethods = [
      "Card",
      "Tap to Pay",
      "Mobile Wallet",
      "Cash",
    ];

    const handlePayment = async () => {
      setLastPointsSummary(null);

      // 1) Create the order in DB with breakdown
      const result = await sendOrderToSystem(
        cart,
        "kiosk",
        "Kiosk",
        session?.user?.email ?? null,
        orderSummary
      );

      if (!result || !result.orderID) {
        alert("Order failed: no order ID returned.");
        return;
      }

      // 2) If the user is signed in, update loyalty points
      if (session?.user?.email) {
        try {
          const pointsSpent = orderSummary.pointsSpent || 0;
          const pointsEarned = Math.floor(orderSummary.total || 0);

          const res = await fetch("/api/rewards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pointsEarned,
              pointsSpent,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const newPoints =
              typeof data.loyaltyPoints === "number"
                ? data.loyaltyPoints
                : loyaltyPoints;

            setLoyaltyPoints(newPoints);
            setPointsToRedeem(0);
            setLastPointsSummary({
              pointsEarned,
              pointsSpent,
              pointsAfter: newPoints,
            });
          } else {
            const data = await res.json().catch(() => ({}));
            console.error(
              "Failed to update rewards:",
              data.error
            );
          }
        } catch (err) {
          console.error("Error updating rewards:", err);
        }
      }

      // 3) Show receipt / success screen
      setLastOrderId(result.orderID);
      setScreen("success");
    };

    if (!accessibilityMode) {
      return (
        <div
          style={{
            padding: "20px",
            pointerEvents: "auto",
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
            onClick={() => setScreen("cart")}
            style={{
              padding: "15px 30px",
              backgroundColor: "#ccc",
              borderRadius: "10px",
              border: "none",
              fontSize: "20px",
              marginTop: "20px",
              fontFamily:
                "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          >
            Back
          </button>
        </div>
      );
    }

    // Accessibility mode: double-tap confirm behavior
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          backgroundColor: "#000",
          color: "#fff",
          minHeight: "100vh",
          fontFamily:
            "'Helvetica Neue', Helvetica, Arial, sans-serif",
          pointerEvents: "auto",
        }}
      >
        <h2 style={{ fontSize: "44px" }}>Payment</h2>

        <p
          style={{
            fontSize: "28px",
            marginBottom: "30px",
            fontFamily:
              "'Helvetica Neue', Helvetica, Arial, sans-serif",
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

              // Second tap = confirm and pay
              handlePayment();
            }}
            style={{
              width: "90%",
              padding: "30px",
              margin: "20px auto",
              display: "block",
              backgroundColor:
                confirmMethod === method
                  ? "#FFD700"
                  : "#500000",
              color:
                confirmMethod === method ? "#000" : "#fff",
              border: "none",
              borderRadius: "14px",
              fontSize: "32px",
              cursor: "pointer",
              fontFamily:
                "'Helvetica Neue', Helvetica, Arial, sans-serif",
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
          onClick={() => setScreen("cart")}
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

  // === SUCCESS / RECEIPT SCREEN WITH TAX + POINTS + QR CODE ===
  const SuccessScreen = ({
    accessibilityMode,
    orderId,
    orderSummary,
    lastPointsSummary,
  }) => {
    const subtotal =
      orderSummary?.subtotal ??
      cart.reduce(
        (sum, item) =>
          sum +
          Number(item.finalPrice || item.price || 0) *
            Number(item.quantity || 1),
        0
      );
    const discount = orderSummary?.discount ?? 0;
    const tax = orderSummary?.tax ?? 0;
    const total = orderSummary?.total ?? subtotal - discount + tax;

    const now = new Date();

    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          backgroundColor: accessibilityMode
            ? "#000"
            : "#f8f0d7ff",
          color: accessibilityMode ? "#fff" : "#000",
          minHeight: "100vh",
          pointerEvents: "auto",
        }}
      >
        <h1
          style={{ fontSize: "48px", marginBottom: "10px" }}
        >
          Payment Successful!
        </h1>
        <p
          style={{ fontSize: "24px", marginBottom: "30px" }}
        >
          Thank you for your order.
        </p>

        <div
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            textAlign: "left",
            backgroundColor: "#fff",
            color: "#000",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              marginBottom: "8px",
              borderBottom: "1px solid #ddd",
              paddingBottom: "8px",
            }}
          >
            Receipt
          </h2>

          <div
            style={{
              fontSize: "14px",
              marginBottom: "12px",
              color: "#555",
            }}
          >
            <div>
              Order ID: <strong>{orderId}</strong>
            </div>
            <div>
              Date: {now.toLocaleDateString()}{" "}
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          {/* QR CODE */}
          {orderId && (
            <div
              style={{
                textAlign: "center",
                margin: "20px 0",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                Scan to view your order:
              </p>
              <QRCodeCanvas
                value={`https://project-3-team-70.vercel.app/receipt?orderid=${orderId}`}
                size={160}
                includeMargin={true}
                fgColor="#000"
                bgColor="#fff"
                style={{ borderRadius: "8px" }}
              />
            </div>
          )}

          <div
            style={{
              borderTop: "1px dashed #ccc",
              paddingTop: "10px",
              marginTop: "10px",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {cart.map((item, idx) => {
              const lineTotal =
                Number(item.finalPrice || item.price || 0) *
                Number(item.quantity || 1);

              return (
                <div
                  key={`${item.id}-${idx}`}
                  style={{
                    marginBottom: "8px",
                    fontSize: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {item.name} (x{item.quantity || 1})
                    </span>
                    <span>
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>
                  {item.size && (
                    <div style={{ fontSize: "13px", opacity: 0.8 }}>
                      Size: {item.size}
                    </div>
                  )}
                  {item.toppings &&
                    item.toppings.length > 0 && (
                      <div
                        style={{
                          fontSize: "13px",
                          opacity: 0.8,
                        }}
                      >
                        Toppings:{" "}
                        {item.toppings
                          .map((t) => t.name)
                          .join(", ")}
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          {/* Price breakdown */}
          <div
            style={{
              borderTop: "1px solid #ddd",
              marginTop: "12px",
              paddingTop: "12px",
              fontSize: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span>Discount</span>
                <span>- ${discount.toFixed(2)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>Tax (6.25%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "18px",
                fontWeight: "bold",
                marginTop: "6px",
              }}
            >
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Points summary if applicable */}
          {lastPointsSummary && (
            <div
              style={{
                borderTop: "1px dashed #ddd",
                marginTop: "10px",
                paddingTop: "10px",
                fontSize: "14px",
              }}
            >
              <div>
                Points spent:{" "}
                <strong>
                  {lastPointsSummary.pointsSpent}
                </strong>
              </div>
              <div>
                Points earned:{" "}
                <strong>
                  {lastPointsSummary.pointsEarned}
                </strong>
              </div>
              <div>
                New balance:{" "}
                <strong>
                  {lastPointsSummary.pointsAfter}
                </strong>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setCart([]);
            setLastOrderId(null);
            window.location.href = "/welcome";
          }}
          style={{
            padding: "20px 40px",
            backgroundColor: "#FFD700",
            border: "none",
            borderRadius: "10px",
            fontSize: "24px",
            marginTop: "40px",
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    );
  };

  const AllergyFilterPanel = () => {
    const allergens = ["Dairy", "Nuts"];

    const toggleAllergen = (a) => {
      setExcludedAllergies((prev) =>
        prev.includes(a)
          ? prev.filter((x) => x !== a)
          : [...prev, a]
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

  // === MAIN RENDER SWITCH ===
  if (screen === "details")
    return (
      <DrinkDetailsPage accessibilityMode={accessibilityMode} />
    );

  if (screen === "cart")
    return (
      <CartScreen
        accessibilityMode={accessibilityMode}
        speak={speak}
        narrationOn={narrationOn}
        language={language}
        setOrderSummary={setOrderSummary}
      />
    );

  if (screen === "payment")
    return (
      <PaymentScreen
        accessibilityMode={accessibilityMode}
      />
    );

  if (screen === "success") {
    return (
      <SuccessScreen
        accessibilityMode={accessibilityMode}
        orderId={lastOrderId}
        orderSummary={orderSummary}
        lastPointsSummary={lastPointsSummary}
      />
    );
  }

  // === MAIN MENU SCREEN ===
  return (
    <div
      style={{
        textAlign: "center",
        backgroundColor: accessibilityMode
          ? "#000"
          : "#f8f0d7ff",
        color: accessibilityMode ? "#fff" : "#000",
        minHeight: "100vh",
        padding: accessibilityMode ? "40px" : "20px",
        position: "relative",
        transition: "all 0.3s ease",
      }}
    >
      <WeatherWidget accessibilityMode={accessibilityMode} />
      {allergyFilterOpen && <AllergyFilterPanel />}

      {/* Sign-in bar for rewards */}
      <div
        style={{
          position: "absolute",
          top: accessibilityMode ? "28px" : "20px",
          right: accessibilityMode ? "240px" : "200px",
          backgroundColor: accessibilityMode
            ? "#111"
            : "#ffffff",
          color: accessibilityMode ? "#fff" : "#000",
          borderRadius: "12px",
          padding: accessibilityMode ? "12px 16px" : "8px 12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          fontSize: accessibilityMode ? "18px" : "14px",
          display: "flex",
          alignItems: "center",
          gap: accessibilityMode ? "12px" : "8px",
          zIndex: 12,
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
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
                padding: accessibilityMode
                  ? "10px 16px"
                  : "6px 10px",
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

      <div
        id="google_translate_element"
        style={{ display: "none" }}
      />

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
          onChange={(e) =>
            handleLanguageChange(e.target.value)
          }
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
          <option value="zh-CN">
            Chinese (Simplified)
          </option>
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
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        Sharetea Self-Order Kiosk
      </h1>

      <p
        style={{
          fontSize: accessibilityMode ? "24px" : "18px",
          marginBottom: accessibilityMode ? "30px" : "20px",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        Welcome! Tap a drink to start your order.
      </p>

      {/* Category buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: "12px 20px",
              borderRadius: "8px",
              backgroundColor:
                activeCategory === cat
                  ? "#FFD700"
                  : "#500000",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              transition: "all 0.2s ease",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accessibility + Allergy filter */}
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
          onClick={() =>
            setAccessibilityMode(!accessibilityMode)
          }
          aria-pressed={accessibilityMode}
          aria-label="Toggle Accessibility Mode"
          style={{
            padding: accessibilityMode
              ? "18px 30px"
              : "10px 20px",
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
            ? "Accessibility Mode: ON"
            : "Accessibility Mode: OFF"}
        </button>

        <button
          onClick={() => setAllergyFilterOpen(true)}
          aria-label="Open Allergy Filter"
          style={{
            padding: accessibilityMode
              ? "18px 30px"
              : "10px 20px",
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
      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

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
                    fontSize: accessibilityMode
                      ? "28px"
                      : "22px",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  {sampleItem && (
                    <img
                      src={sampleItem.image}
                      alt={cat}
                      onError={(e) => {
                        e.target.src =
                          "/images/default.png";
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
                      gap: accessibilityMode
                        ? "40px"
                        : "25px",
                      marginTop: "20px",
                      marginBottom: "30px",
                    }}
                  >
                    {filteredMenuItems
                      .filter(
                        (item) => item.category === cat
                      )
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
                                backgroundColor:
                                  "#f5f5f5",
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
                                item.finalPrice ||
                                  item.price
                              ).toFixed(2)}
                            </p>
                            {item.description && (
                              <p
                                style={{
                                  fontSize:
                                    accessibilityMode
                                      ? "18px"
                                      : "14px",
                                  opacity: 0.8,
                                }}
                              >
                                {item.description}
                              </p>
                            )}

                            {/* ALLERGY ICONS */}
                            {item.allergies &&
                              item.allergies.length >
                                0 && (
                                <div
                                  style={{
                                    marginTop:
                                      "10px",
                                    display:
                                      "flex",
                                    gap: "8px",
                                  }}
                                >
                                  {item.allergies.includes(
                                    "Dairy"
                                  ) && (
                                    <span
                                      style={{
                                        fontSize:
                                          "20px",
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
                                        fontSize:
                                          "20px",
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
                                        fontSize:
                                          "20px",
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
                                        fontSize:
                                          "20px",
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
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.3)",
            cursor: "pointer",
            zIndex: 2000,
          }}
        >
          🛒 {cart.length}
        </button>
      )}

      {/* Back to home button */}
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
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.3)",
          cursor: "pointer",
          zIndex: 2000,
        }}
      >
        ← Back
      </button>
    </div>
  );
}
