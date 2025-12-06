// pages/kiosk.js
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

function getTextFromDOM(id) {
  const el = document.getElementById(id);
  return el ? el.innerText : "";
}

// === SEND ORDERS TO BACKEND ===
async function sendOrderToSystem(order) {
  const rawItems = Array.isArray(order)
    ? order
    : (order && order.items) || [];

  try {
    const items = rawItems.map((i) => ({
      menuID: i.id,
      quantity: 1, // kiosk items are one each
      priceAtPurchase: Number(i.price || 0),
      size: null,
    }));

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "kiosk",
        orderLocation: "Kiosk",
        items,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("Order submission failed:", data.error);
      alert("Sorry, we couldn't process your order. Please try again.");
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error sending order:", err);
    alert("Sorry, we couldn't process your order. Please try again.");
    return false;
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

// === Main Kiosk Page ===
export default function KioskPage() {
  // --- STATE ---
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [narrationOn, setNarrationOn] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState("en");
  const [activeCategory, setActiveCategory] = useState(null);
  const [screen, setScreen] = useState("menu");
  const [detailsItem, setDetailsItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [toppingsError, setToppingsError] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]);

  const removeFromCart = (indexToRemove) =>
    setCart((prev) => prev.filter((_, i) => i !== indexToRemove));

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

  const { data: session } = useSession();
  const [loyaltyPoints, setLoyaltyPoints] = useState(null);
  const [pointsError, setPointsError] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // --- Load rewards points ---
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

  // --- Load menu ---
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

  // --- Load toppings ---
  useEffect(() => {
    async function fetchToppings() {
      try {
        const res = await fetch("/api/toppings");
        if (!res.ok) throw new Error("Failed");

        const data = await res.json();
        setToppings(data);
      } catch (err) {
        console.error("Error loading toppings:", err);
        setToppingsError("Could not load toppings");
      }
    }
    fetchToppings();
  }, []);

  // --- Google Translate widget ---
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

    setAccessibilityLabel({ on: labelOn, off: labelOff });

    document.cookie = `googtrans=/en/${langCode};path=/`;
    window.location.reload();
  }

  // --- Item narration ---
  const handlePress = (item) => {
    setSelectedItem(item.id);

    if (narrationOn) {
      const name = getTextFromDOM(`name-${item.id}`);
      const price = getTextFromDOM(`price-${item.id}`);
      const desc = getTextFromDOM(`desc-${item.id}`);

      const message = `${name}. ${price}.${
        desc ? " " + desc : ""
      }`;

      speak(message, language);
    }

    setTimeout(() => setSelectedItem(null), 300);
  };

  const toggleNarration = () => {
    const newState = !narrationOn;
    setNarrationOn(newState);

    const msgId = newState
      ? "narration-enabled"
      : "narration-disabled";
    const text = getTextFromDOM(msgId);

    speak(text, language);
  };

  const addToCart = (item) => {
    setCart((prev) => [...prev, item]);

    if (narrationOn) {
      speak(`${item.name} added to cart.`, language);
    }
  };

  // --- DRINK DETAILS PAGE ---
  const DrinkDetailsPage = () => {
    if (!detailsItem) return null;

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
          id="back-btn"
          onClick={async () => {
            if (narrationOn) {
              const msg = getTextFromDOM("going-back");
              speak(msg, language);
            }
            setScreen("menu");
          }}
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
          ${Number(detailsItem.price).toFixed(2)}
        </p>
        <p
          style={{
            fontSize: "20px",
            width: "80%",
            margin: "0 auto",
            marginBottom: "40px",
          }}
        >
          {detailsItem.description}
        </p>

        {/* Toppings selection */}
        {toppings.length > 0 && (
          <div
            style={{
              margin: "20px auto",
              width: "80%",
              textAlign: "left",
            }}
          >
            <h3 style={{ fontSize: "24px", marginBottom: "10px" }}>
              Customize your drink
            </h3>

            {toppingsError && (
              <p style={{ color: "red" }}>{toppingsError}</p>
            )}

            {toppings.map((top) => {
              const checked = selectedToppings.some(
                (t) => t.inventoryID === top.inventoryID
              );

              return (
                <label
                  key={top.inventoryID}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                    fontSize: "18px",
                  }}
                >
                  <span>
                    {top.inventoryName}
                    {top.allergy && (
                      <span
                        style={{
                          fontSize: "14px",
                          marginLeft: "6px",
                          color: "#b91c1c",
                        }}
                      >
                        ({top.allergy})
                      </span>
                    )}
                  </span>

                  <span style={{ marginLeft: "8px" }}>
                    +${top.addOnPrice.toFixed(2)}
                  </span>

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedToppings((prev) => {
                        if (checked) {
                          return prev.filter(
                            (t) => t.inventoryID !== top.inventoryID
                          );
                        }
                        return [...prev, top];
                      });
                    }}
                  />
                </label>
              );
            })}
          </div>
        )}

        <button
          onClick={() => {
            const basePrice = Number(detailsItem.price || 0);
            const extrasTotal = selectedToppings.reduce(
              (sum, t) => sum + Number(t.addOnPrice || 0),
              0
            );

            const itemForCart = {
              ...detailsItem,
              toppings: selectedToppings,
              price: (basePrice + extrasTotal).toFixed(2),
            };

            addToCart(itemForCart);
            setSelectedToppings([]); // reset toppings
            setScreen("menu");
          }}
          style={{
            padding: "20px 40px",
            backgroundColor: "#FFD700",
            color: "#000",
            border: "none",
            borderRadius: "15px",
            fontSize: "26px",
            cursor: "pointer",
          }}
        >
          Add to Cart
        </button>
      </div>
    );
  };

  // --- CART SCREEN ---
  const CartScreen = () => (
    <div style={{ padding: "20px" }}>
      <h2 style={{ fontSize: "36px" }}>Your Cart</h2>

      {cart.length === 0 ? (
        <p style={{ fontSize: "22px" }}>Your cart is empty.</p>
      ) : (
        cart.map((item, index) => (
          <p key={index} style={{ fontSize: "22px" }}>
            {item.name} — ${item.price}
          </p>
        ))
      )}

      <button
        onClick={() => {
          if (narrationOn) {
            speak("Proceeding to checkout.", language);
          }
          setScreen("checkout");
        }}
        disabled={cart.length === 0}
        style={{
          padding: "20px 40px",
          backgroundColor: "#FFD700",
          border: "none",
          borderRadius: "10px",
          fontSize: "24px",
          marginTop: "20px",
        }}
      >
        Proceed to Checkout
      </button>

      <button
        onClick={() => setScreen("menu")}
        style={{
          padding: "15px 30px",
          backgroundColor: "#ccc",
          border: "none",
          borderRadius: "10px",
          fontSize: "20px",
          marginLeft: "20px",
        }}
      >
        Back
      </button>
    </div>
  );

  // --- CHECKOUT SCREEN ---
  const CheckoutScreen = () => {
    const total = cart.reduce(
      (sum, item) => sum + Number(item.price),
      0
    );

    const maxRedeemable =
      typeof loyaltyPoints === "number"
        ? Math.min(loyaltyPoints, Math.floor(total))
        : 0;

    const applied = Math.min(
      pointsToRedeem || 0,
      maxRedeemable
    );

    const finalTotal = total - applied;

    return (
      <div style={{ padding: "20px" }}>
        <h2 style={{ fontSize: "36px" }}>Order Summary</h2>

        {cart.length === 0 && (
          <p style={{ fontSize: "20px", marginTop: "10px" }}>
            Your cart is empty.
          </p>
        )}

        {cart.map((item, index) => (
          <div
            key={index}
            style={{
              fontSize: "22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "8px 0",
            }}
          >
            <div>
              <div>
                {item.name} — $
                {Number(item.price).toFixed(2)}
              </div>

              {item.toppings && item.toppings.length > 0 && (
                <div
                  style={{
                    fontSize: "16px",
                    opacity: 0.8,
                    marginTop: "4px",
                  }}
                >
                  Toppings:{" "}
                  {item.toppings
                    .map((t) => t.inventoryName)
                    .join(", ")}
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
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        ))}

        {/* Points */}
        {cart.length > 0 &&
          typeof loyaltyPoints === "number" && (
            <div
              style={{
                marginTop: "20px",
                padding: "12px",
                borderRadius: "10px",
                backgroundColor: "#f3f4f6",
              }}
            >
              <p
                style={{
                  fontSize: "18px",
                  marginBottom: "6px",
                }}
              >
                Available points: {loyaltyPoints}
              </p>

              <label style={{ fontSize: "16px" }}>
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
                    border: "1px solid #ccc",
                    width: "80px",
                  }}
                />
              </label>

              <p
                style={{
                  fontSize: "16px",
                  marginTop: "6px",
                }}
              >
                Discount: ${applied.toFixed(2)}
              </p>
            </div>
          )}

        <h3
          style={{
            fontSize: "28px",
            marginTop: "20px",
          }}
        >
          Total: ${finalTotal.toFixed(2)}
        </h3>

        <button
          onClick={() => {
            if (narrationOn) {
              speak("Continuing to payment.", language);
            }
            setScreen("payment");
          }}
          style={{
            padding: "20px 40px",
            backgroundColor: "#FFD700",
            border: "none",
            borderRadius: "10px",
            fontSize: "24px",
            marginTop: "20px",
          }}
          disabled={cart.length === 0}
        >
          Continue to Payment
        </button>

        <button
          onClick={() => {
            if (narrationOn) {
              speak("Going back.", language);
            }
            setScreen("cart");
          }}
          style={{
            padding: "15px 30px",
            backgroundColor: "#ccc",
            borderRadius: "10px",
            border: "none",
            fontSize: "20px",
            marginLeft: "20px",
          }}
        >
          Back
        </button>
      </div>
    );
  };

  // --- PAYMENT SCREEN ---
  const PaymentScreen = () => {
    const [confirmMethod, setConfirmMethod] = useState(null);

    const paymentMethods = [
      "Card",
      "Tap to Pay",
      "Mobile Wallet",
      "Cash",
    ];

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
              onClick={() => {
                if (narrationOn) {
                  speak(`${method} selected.`, language);
                }
                setScreen("success");
              }}
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

    // ACCESSIBILITY MODE
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

              if (confirmMethod !== method) {
                if (narrationOn) {
                  speak(
                    `${method}. Tap again to confirm.`,
                    language
                  );
                }
                setConfirmMethod(method);
                return;
              }

              if (narrationOn) {
                speak("Payment confirmed.", language);
              }

              setScreen("success");
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

  // --- SUCCESS SCREEN ---
  const SuccessScreen = () => (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1 style={{ fontSize: "48px" }}>Payment Successful!</h1>

      <p style={{ fontSize: "24px", marginTop: "20px" }}>
        Thank you for your order.
      </p>

      <button
        onClick={async () => {
          if (narrationOn) {
            speak(
              "Order complete. Returning to menu.",
              language
            );
          }

          await sendOrderToSystem(cart);
          setCart([]);
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

  // --- MAIN SCREEN SWITCH ---
  if (screen === "details") return <DrinkDetailsPage />;
  if (screen === "cart") return <CartScreen />;
  if (screen === "checkout") return <CheckoutScreen />;
  if (screen === "payment") return <PaymentScreen />;
  if (screen === "success") return <SuccessScreen />;

  // --- MAIN MENU ---
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
        touchAction: "manipulation",
        transition: "all 0.3s ease",
      }}
    >
      {/* Hidden narration strings */}
      <div id="narration-enabled" style={{ display: "none" }}>
        Narration enabled. Tap a drink to hear its description.
      </div>

      <div
        id="narration-disabled"
        style={{ display: "none" }}
      >
        Narration disabled.
      </div>

      <div id="going-back" style={{ display: "none" }}>
        Going back.
      </div>

      <WeatherWidget
        accessibilityMode={accessibilityMode}
      />

      {/* Rewards / Sign In bar */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "120px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "8px 12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 12,
        }}
      >
        {!session ? (
          <>
            <span>Sign in for rewards:</span>

            <button
              onClick={() =>
                signIn("google", {
                  callbackUrl: "/kiosk",
                })
              }
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#500000",
                color: "#fff",
                cursor: "pointer",
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

      {/* Google Translate */}
      <div
        id="google_translate_element"
        style={{ display: "none" }}
      />

      {/* Language dropdown */}
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

      {/* Categories buttons */}
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
            id={`${cat}-${cat}`}
            onClick={async () => {
              setActiveCategory(cat);

              if (narrationOn) {
                const spokenCat = getTextFromDOM(
                  `${cat}-${cat}`
                );
                speak(spokenCat, language);
              }
            }}
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

      {/* Accessibility toggle */}
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
          marginBottom: accessibilityMode ? "40px" : "25px",
          transition: "all 0.2s ease",
        }}
      >
        <span
          id="label-off"
          style={{
            display: accessibilityMode ? "none" : "inline",
          }}
        >
          Accessibility Mode: OFF
        </span>

        <span
          id="label-on"
          style={{
            display: accessibilityMode ? "inline" : "none",
          }}
        >
          Accessibility Mode: ON
        </span>
      </button>

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
                    fontSize: accessibilityMode
                      ? "28px"
                      : "24px",
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
                      gridTemplateColumns: accessibilityMode
                        ? "repeat(auto-fit, minmax(300px, 1fr))"
                        : "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: accessibilityMode
                        ? "40px"
                        : "25px",
                      marginTop: "20px",
                      marginBottom: "30px",
                    }}
                  >
                    {menuItems
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
                            <img
                              src={item.image}
                              alt={item.name}
                              onError={(e) => {
                                e.target.src =
                                  "/Images/default.png";
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
                              id={`name-${item.id}`}
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
                              id={`price-${item.id}`}
                              style={{
                                fontSize: accessibilityMode
                                  ? "22px"
                                  : "18px",
                              }}
                            >
                              $
                              {Number(item.price).toFixed(2)}
                            </p>

                            {item.description && (
                              <p
                                id={`desc-${item.id}`}
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

      {/* Back to home button */}
      <button
        onClick={() => {
          window.location.href = "/";
        }}
        style={{
          position: "fixed",
          bottom: "20px",
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