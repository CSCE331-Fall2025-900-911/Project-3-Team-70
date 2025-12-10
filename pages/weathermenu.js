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
function pickRecommendations(menu, weather) {
  if (!menu || menu.length === 0) return { recs: [], mode: "default" };

  const temp = getTempF(weather);
  const hour = new Date().getHours();

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

      const { recs, mode } = pickRecommendations(m, w);
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
    <FeaturedDrinkView
      drink={currentDrink}
      weather={weather}
      clientTime={clientTime}
      mode={mode}
      index={index}
      total={recs.length}
    />
  );
}
