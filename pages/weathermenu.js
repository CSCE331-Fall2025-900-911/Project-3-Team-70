// pages/weathermenu.js
import { useEffect, useState } from "react";
import FeaturedDrinkView from "../components/featuredDrinkView";

const HOT = ["Fruity Beverage", "Ice-Blended", "Non-Caffeinated"];
const COLD = ["Milky Series", "Fresh Brew", "New Matcha Series"];
const LATE = ["Non-Caffeinated", "Fruity Beverage", "Ice-Blended"];
const DEFAULT = ["Milky Series", "Fruity Beverage", "Ice-Blended"];

// Convert OpenWeather temp to Fahrenheit
function getTempF(w) {
  if (!w?.main?.temp) return null;
  return (w.main.temp - 273.15) * 1.8 + 32;
}

// Build recommended drinks list
function pickRecommendations(menu, weather, overrideTempF = null, overrideHour = null) {
  if (!menu || menu.length === 0) return { recs: [], mode: "default" };

  const temp = overrideTempF !== null
    ? overrideTempF
    : getTempF(weather);
  const hour = overrideHour !== null
    ? overrideHour
    : new Date().getHours();

  const isLate = hour >= 20 || hour < 6;
  const isHot = temp !== null && temp >= 80;
  const isCold = temp !== null && temp <= 55;

  let pref = DEFAULT;
  let mode = "default";

  if (isLate) {
    pref = LATE;
    mode = "late";
  } else if (isHot) {
    pref = HOT;
    mode = "hot";
  } else if (isCold) {
    pref = COLD;
    mode = "cold";
  }

  const picks = [];
  const maxRecs = 5;

  // Try preferred categories first
  for (const cat of pref) {
    for (const item of menu) {
      if (item.category === cat && !picks.some((p) => p.id === item.id)) {
        picks.push(item);
        if (picks.length >= maxRecs) break;
      }
    }
    if (picks.length >= maxRecs) break;
  }

  // Fill remaining slots with any drink
  if (picks.length < maxRecs) {
    for (const item of menu) {
      if (!picks.some((p) => p.id === item.id)) {
        picks.push(item);
        if (picks.length >= maxRecs) break;
      }
    }
  }

  return { recs: picks, mode };
}

export default function WeatherRecommendationsPage() {
  const [menu, setMenu] = useState([]);
  const [weather, setWeather] = useState(null);
  const [clientTime, setClientTime] = useState("");
  const [recs, setRecs] = useState([]);
  const [mode, setMode] = useState("default");
  const [index, setIndex] = useState(0);

  // For override
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideTempF, setOverrideTempF] = useState(null);
  const [overrideHour, setOverrideHour] = useState(null);

  // Timestamp update
  useEffect(() => {
    setClientTime(new Date().toLocaleString());
  }, []);

  // Load menu + weather
  useEffect(() => {
    async function load() {
      const [mRes, wRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/weather"),
      ]);

      const [m, w] = await Promise.all([mRes.json(), wRes.json()]);
      setMenu(m);
      setWeather(w);

      const syntheticWeather = overrideTempF !== null
        ? { main: { temp: (overrideTempF - 32) * (5/9) + 273.15 } } // convert F → Kelvin
        : w;

      const { recs, mode } = pickRecommendations(m, syntheticWeather, overrideTempF, overrideHour);
      setRecs(recs);
      setMode(mode);
    }
    load();
  }, []);

  // Cycle drinks every 6 seconds
  useEffect(() => {
    if (recs.length === 0) return;

    const t = setInterval(() => {
      setIndex((i) => (i + 1) % recs.length);
    }, 6000);

    return () => clearInterval(t);
  }, [recs]);

  const currentDrink = recs[index] ?? null;

return (
  <>

    {/* OVERRIDE PANEL (only visible when open) */}
    {overrideOpen && (
      <div
        style={{
          padding: "20px",
          margin: "20px auto",
          background: "#eee",
          borderRadius: "10px",
          maxWidth: "480px",
          textAlign: "center",
        }}
      >
        <h3 style={{ marginBottom: "10px" }}>
          Weather & Time Override (Demo Mode)
        </h3>

        {/* TEMP OVERRIDE */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontWeight: "bold" }}>Temperature (°F):</label>
          <input
            type="number"
            placeholder="e.g., 95"
            value={overrideTempF ?? ""}
            onChange={(e) =>
              setOverrideTempF(
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            style={{
              width: "160px",
              padding: "8px",
              marginLeft: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc"
            }}
          />
        </div>

        {/* TIME OVERRIDE */}
        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontWeight: "bold" }}>Hour Override (0–23):</label>
          <input
            type="number"
            min="0"
            max="23"
            placeholder="e.g., 22"
            value={overrideHour ?? ""}
            onChange={(e) =>
              setOverrideHour(
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            style={{
              width: "160px",
              padding: "8px",
              marginLeft: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc"
            }}
          />
        </div>

        {/* APPLY + RESET BUTTONS */}
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => {
              const syntheticWeather = overrideTempF !== null
                ? { main: { temp: (overrideTempF - 32) * (5/9) + 273.15 } }
                : weather;

              const result = pickRecommendations(menu, syntheticWeather, overrideTempF, overrideHour);
              setRecs(result.recs);
              setMode(result.mode);
            }}
            style={{
              padding: "10px 18px",
              background: "#500000",
              color: "white",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              marginRight: "10px"
            }}
          >
            Apply Overrides
          </button>

          <button
            onClick={() => {
              setOverrideTempF(null);
              setOverrideHour(null);
              const result = pickRecommendations(menu, weather, null, null);
              setRecs(result.recs);
              setMode(result.mode);
            }}
            style={{
              padding: "10px 18px",
              background: "#777",
              color: "white",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Reset to Real Weather/Time
          </button>
        </div>
      </div>
    )}

    {/* ORIGINAL DISPLAY COMPONENT */}
    <FeaturedDrinkView
      drink={currentDrink}
      weather={weather}
      clientTime={clientTime}
      mode={mode}
      index={index}
      total={recs.length}
      overrideOpen={overrideOpen}
      setOverrideOpen={setOverrideOpen}
    />
  </>
);

}
