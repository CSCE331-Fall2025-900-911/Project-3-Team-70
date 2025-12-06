import { useState, useEffect } from "react";

// === SEND ORDERS ===
function sendOrderToSystem(order) {
  // Load existing orders
  const existing = JSON.parse(localStorage.getItem("orders") || "[]");

  // Push new order
  existing.push(order);

  // Save back to localStorage
  localStorage.setItem("orders", JSON.stringify(existing));
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
          Math.round((k - 273.15) * 9 / 5 + 32);

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

  // NEW — screens + cart
  const [screen, setScreen] = useState("menu"); 
  const [detailsItem, setDetailsItem] = useState(null);
  const [cart, setCart] = useState([]);

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
            image: `/Images/${id}.png`,
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

  // === language widget ===
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

  // === Add to Cart ===
  const addToCart = (item) => {
    setCart((prev) => [...prev, item]);
    if (narrationOn) {
      speak(`${item.name} added to cart.`, language);
    }
  };

  // === INVENTORY DATA (temporary local version) ===
  const inventoryData = [
    { id: 1, name: "Sugar", price: 1, allergy: "None" },
    { id: 2, name: "Whole Milk", price: 1, allergy: "Dairy" },
    { id: 3, name: "Skim Milk", price: 1, allergy: "Dairy" },
    { id: 4, name: "Oat Milk", price: 1, allergy: "None" },
    { id: 5, name: "Soy Milk", price: 1, allergy: "Soy" },
    { id: 6, name: "Condensed Milk", price: 1, allergy: "Dairy" },
    { id: 7, name: "Coconut Milk", price: 1, allergy: "None" },
    { id: 8, name: "Non-dairy Creamer", price: 1, allergy: "None" },
    { id: 9, name: "Ice Cream", price: 1.5, allergy: "Dairy" },
    { id: 10, name: "Black Tea", price: 1, allergy: "None" },
    { id: 11, name: "Green Tea", price: 1, allergy: "None" },
    { id: 12, name: "Oolong Tea", price: 1, allergy: "None" },
    { id: 13, name: "Thai Tea", price: 1, allergy: "Dairy" },
    { id: 14, name: "Honey", price: 1, allergy: "None" },
    { id: 15, name: "Honey Jelly", price: 1, allergy: "None" },
    { id: 16, name: "Lychee Jelly", price: 1, allergy: "None" },
    { id: 17, name: "Stevia", price: 1, allergy: "None" },
    { id: 18, name: "Taro Powder", price: 1, allergy: "Dairy" },
    { id: 19, name: "Matcha Powder", price: 1, allergy: "None" },
    { id: 20, name: "Chocolate Syrup", price: 1, allergy: "Nuts" },
    { id: 21, name: "Coffee Syrup", price: 1, allergy: "Nuts" },
    { id: 22, name: "Coffee Jelly", price: 1, allergy: "None" },
    { id: 23, name: "Tapioca Pearls", price: 1, allergy: "None" },
    { id: 24, name: "Crystal Boba", price: 1, allergy: "None" },
    { id: 25, name: "Strawberry Popping Boba", price: 1, allergy: "None" },
    { id: 26, name: "Mango Popping Boba", price: 1, allergy: "None" }
  ];


  // === CUSTOMIZATION UI ===
  const DrinkDetailsPage = () => {
    const [selectedToppings, setSelectedToppings] = useState([]);
    const [sweetness, setSweetness] = useState("100%");
    const [iceLevel, setIceLevel] = useState("Regular Ice");

    if (!detailsItem) return null;

    // Match by ID, not object reference
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

    const finalize = () => {
      addToCart({
        ...detailsItem,
        toppings: selectedToppings,
        sweetness,
        iceLevel,
        finalPrice: totalPrice
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
             e.target.src = "/Images/default.png";
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
        <h2 style={{ fontSize: "30px", marginTop: "20px" }}>Toppings</h2>

        <div
          style={{
            width: "80%",
            margin: "0 auto",
            maxHeight: "300px",
            overflowY: "scroll",
            border: "1px solid #ccc",
            borderRadius: "15px",
            padding: "10px",
          }}
        >
          {inventoryData.map((topping) => {
            const checked = selectedToppings.some((t) => t.id === topping.id);
            const hasAllergen =
              topping.allergy && topping.allergy !== "None";

            return (
              <div
                key={topping.id}
                style={{
                  margin: "10px 0",
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: accessibilityMode ? "#111" : "#f9f9f9",
                  border: checked ? "2px solid #FFD700" : "1px solid #ccc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: accessibilityMode ? "26px" : "20px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTopping(topping)}
                      style={{ width: "25px", height: "25px" }}
                    />
                    {topping.name}
                  </label>

                  <span style={{ fontSize: accessibilityMode ? "22px" : "18px" }}>
                    + ${Number(topping.price).toFixed(2)}
                  </span>
                </div>

                {/* Allergy Warning */}
                {hasAllergen && (
                  <p
                    style={{
                      fontSize: accessibilityMode ? "22px" : "16px",
                      fontWeight: "bold",
                      color: "red",
                      marginTop: "5px",
                    }}
                  >
                    ⚠ Contains {topping.allergy}
                  </p>
                )}
              </div>
            );
          })}
        </div>

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

        {/* ICE LEVEL */}
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

        {/* FINAL TOTAL */}
        <h2 style={{ marginTop: "30px", fontSize: "30px" }}>
          Total: ${totalPrice.toFixed(2)}
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
            marginTop: "20px",
          }}
        >
          Add to Cart
        </button>
      </div>
    );
  };

  // === CART SCREEN ===
  const CartScreen = ({ accessibilityMode }) => {
    const removeItem = (indexToRemove) => {
      setCart((prev) => prev.filter((_, i) => i !== indexToRemove));
    };

    // Calculate total, using finalPrice if present
    const cartTotal = cart.reduce(
      (sum, item) => sum + Number(item.finalPrice || item.price),
      0
    );

    return (
      <div
        style={{
          padding: accessibilityMode ? "40px" : "20px",
          backgroundColor: accessibilityMode ? "#000" : "#fff",
          color: accessibilityMode ? "#fff" : "#000",
          minHeight: "100vh",
          transition: "all 0.3s ease",
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
                border: accessibilityMode ? "2px solid #FFD700" : "1px solid #ccc",
                borderRadius: "12px",
                fontSize: accessibilityMode ? "26px" : "20px",
                backgroundColor: accessibilityMode ? "#111" : "#fafafa",
                color: accessibilityMode ? "#fff" : "#000",
                position: "relative",
              }}
            >
              {/* REMOVE BUTTON */}
              <button
                onClick={() => removeItem(index)}
                style={{
                  position: "absolute",
                  top: accessibilityMode ? "15px" : "10px",
                  right: accessibilityMode ? "15px" : "10px",
                  backgroundColor: "#b00000",
                  color: "white",
                  border: "none",
                  padding: accessibilityMode ? "12px 18px" : "8px 14px",
                  borderRadius: "8px",
                  fontSize: accessibilityMode ? "20px" : "16px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>

              {/* NAME + PRICE */}
              <p
                style={{
                  fontSize: accessibilityMode ? "32px" : "24px",
                  fontWeight: "bold",
                  marginBottom: "10px",
                }}
              >
                {item.name} — ${(item.finalPrice || item.price).toFixed(2)}
              </p>

              {/* SWEETNESS */}
              {item.sweetness && (
                <p style={{ margin: "5px 0" }}>
                  <strong>Sweetness:</strong> {item.sweetness}
                </p>
              )}

              {/* ICE */}
              {item.iceLevel && (
                <p style={{ margin: "5px 0" }}>
                  <strong>Ice:</strong> {item.iceLevel}
                </p>
              )}

              {/* TOPPINGS */}
              {item.toppings && item.toppings.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <strong>Toppings:</strong>
                  <ul style={{ marginLeft: "20px", marginTop: "5px" }}>
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

        {/* CART TOTAL */}
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

        {/* PROCEED BUTTON */}
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

        {/* BACK BUTTON */}
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



  // === CHECKOUT SCREEN ===
  const CheckoutScreen = ({ accessibilityMode }) => {
    // Use finalPrice when available, otherwise fallback to base price
    const total = cart.reduce(
      (sum, item) => sum + Number(item.finalPrice || item.price),
      0
    );

    return (
      <div
        style={{
          padding: accessibilityMode ? "40px" : "20px",
          backgroundColor: accessibilityMode ? "#000" : "#fff",
          color: accessibilityMode ? "#fff" : "#000",
          minHeight: "100vh",
          transition: "all 0.3s ease",
        }}
      >
        <h2 style={{ fontSize: accessibilityMode ? "48px" : "36px" }}>
          Order Summary
        </h2>

        {cart.map((item, index) => (
          <div
            key={index}
            style={{
              padding: accessibilityMode ? "25px" : "15px",
              margin: "15px 0",
              border: accessibilityMode ? "2px solid #FFD700" : "1px solid #ccc",
              borderRadius: "12px",
              backgroundColor: accessibilityMode ? "#111" : "#fafafa",
              color: accessibilityMode ? "#fff" : "#000",
              fontSize: accessibilityMode ? "26px" : "20px",
              transition: "all 0.3s ease",
            }}
          >
            {/* NAME + FINAL PRICE */}
            <p
              style={{
                fontSize: accessibilityMode ? "32px" : "24px",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              {item.name} — ${(item.finalPrice || item.price).toFixed(2)}
            </p>

            {/* SWEETNESS */}
            {item.sweetness && (
              <p style={{ margin: "5px 0" }}>
                <strong>Sweetness:</strong> {item.sweetness}
              </p>
            )}

            {/* ICE */}
            {item.iceLevel && (
              <p style={{ margin: "5px 0" }}>
                <strong>Ice:</strong> {item.iceLevel}
              </p>
            )}

            {/* TOPPINGS */}
            {item.toppings && item.toppings.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <strong>Toppings:</strong>
                <ul style={{ marginLeft: "20px", marginTop: "5px" }}>
                  {item.toppings.map((t, idx) => (
                    <li key={idx}>
                      {t.name} (+${t.price.toFixed(2)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {/* TOTAL */}
        <h3
          style={{
            fontSize: accessibilityMode ? "40px" : "28px",
            marginTop: "20px",
            textAlign: "right",
            paddingRight: "10px",
          }}
        >
          Total: ${total.toFixed(2)}
        </h3>

        {/* CONTINUE TO PAYMENT */}
        <button
          onClick={() => setScreen("payment")}
          style={{
            padding: accessibilityMode ? "28px 50px" : "20px 40px",
            backgroundColor: "#FFD700",
            border: "none",
            borderRadius: "10px",
            fontSize: accessibilityMode ? "32px" : "24px",
            cursor: "pointer",
            marginTop: "20px",
          }}
        >
          Continue to Payment
        </button>

        {/* BACK BUTTON */}
        <button
          onClick={() => setScreen("cart")}
          style={{
            padding: accessibilityMode ? "22px 40px" : "15px 30px",
            backgroundColor: accessibilityMode ? "#555" : "#ccc",
            borderRadius: "10px",
            border: "none",
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



  // === PAYMENT SCREEN WITH ACCESSIBILITY ONLY WHEN ENABLED ===
  const PaymentScreen = ({ accessibilityMode }) => {
    const [confirmMethod, setConfirmMethod] = useState(null);
  
    const paymentMethods = [
      "Card",
      "Tap to Pay",
      "Mobile Wallet",
      "Cash",
    ];
  
    // NORMAL MODE (simple one-tap buttons)
    if (!accessibilityMode) {
      return (
        <div style={{ padding: "20px" }}>
          <h2 style={{ fontSize: "36px" }}>Payment</h2>
      
          <p style={{ fontSize: "22px" }}>
            Choose a payment method:
          </p>
      
          {paymentMethods.map((method) => (
            <button
              key={method}
              onClick={() => setScreen("success")}
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
  
    // ACCESSIBILITY MODE (double-tap confirm, larger buttons)
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          backgroundColor: "#000",
          color: "#fff",
          minHeight: "100vh",
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
            
              // First tap highlights
              if (confirmMethod !== method) {
                setConfirmMethod(method);
                return;
              }
            
              // Second tap confirms
              setScreen("success");
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
              <div style={{ fontSize: "16px", marginTop: "6px", opacity: 0.8 }}>
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
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1 style={{ fontSize: "48px" }}>Payment Successful!</h1>
      <p style={{ fontSize: "24px", marginTop: "20px" }}>
        Thank you for your order.
      </p>

      <button
        onClick={() => {
          const order = {
            id: Date.now(),
            items: cart,
            total: cart.reduce((sum, i) => sum + Number(i.price), 0),
            time: new Date().toISOString(),
            status: "pending"
          };
        
          // Send order
          sendOrderToSystem(order);
        
          setCart([]);
          setScreen("menu");
        }}
        style={{
          padding: "20px 40px",
          backgroundColor: "#FFD700",
          border: "none",
          borderRadius: "10px",
          fontSize: "26px",
          marginTop: "40px",
        }}
      >
        Return to Menu
      </button>
    </div>
  );

  // === MAIN RENDER SWITCH ===
  if (screen === "details") 
    return <DrinkDetailsPage accessibilityMode={accessibilityMode} />;

  if (screen === "cart") 
    return <CartScreen accessibilityMode={accessibilityMode} />;

  if (screen === "checkout") 
    return <CheckoutScreen accessibilityMode={accessibilityMode} />;

  if (screen === "payment") 
    return <PaymentScreen accessibilityMode={accessibilityMode} />;

  if (screen === "success") 
    return <SuccessScreen accessibilityMode={accessibilityMode} />;

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
      }}
    >
      <WeatherWidget accessibilityMode={accessibilityMode} />

      <button
        onClick={toggleNarration}
        aria-label="Toggle narration mode"
        style={{
          position: "absolute",
          top: "10%",
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
              backgroundColor: activeCategory === cat ? "#FFD700" : "#500000",
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
        <span
          id="label-off"
          style={{ display: accessibilityMode ? "none" : "inline" }}
        >
          Accessibility Mode: OFF
        </span>

        <span
          id="label-on"
          style={{ display: accessibilityMode ? "inline" : "none" }}
        >
          Accessibility Mode: ON
        </span>
      </button>

      {loading && <p>Loading menu...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && screen === "menu" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
                      activeCategory === cat ? "#FFD700" : "#500000",
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
                        e.target.src = "/Images/default.png";
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
                      gridTemplateColumns: accessibilityMode
                        ? "repeat(auto-fit, minmax(300px, 1fr))"
                        : "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: accessibilityMode ? "40px" : "25px",
                      marginTop: "20px",
                      marginBottom: "30px",
                    }}
                  >
                    {menuItems
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
                              color: accessibilityMode ? "#fff" : "#000",
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
                            <img
                              src={item.image}
                              alt={item.name}
                              onError={(e) => {
                                e.target.src = "/Images/default.png";
                              }}
                              style={{
                                width: "100%",
                                height: "200px",
                                objectFit: "cover",
                                borderRadius: "15px",
                                marginBottom: "15px",
                              }}
                            />
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
                              ${Number(item.price).toFixed(2)}
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

      {/* FLOATING CART BUTTON */}
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
    </div>
  );
}
