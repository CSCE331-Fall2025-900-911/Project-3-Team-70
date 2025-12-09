import { useEffect, useState } from "react";
import styles from "../styles/menuboard.module.css";

const CATEGORY_ORDER = [
  "Milky Series",
  "Fresh Brew",
  "Fruity Beverage",
  "Ice-Blended",
  "Non-Caffeinated",
  "New Matcha Series",
  "Valentine's Day",
];

const HOT = ["Fruity Beverage", "Ice-Blended", "Non-Caffeinated"];
const COLD = ["Milky Series", "Fresh Brew", "New Matcha Series"];
const LATE = ["Non-Caffeinated", "Fruity Beverage", "Ice-Blended"];
const DEFAULT = ["Milky Series", "Fruity Beverage", "Ice-Blended"];

function getTempF(w) {
  if (!w?.main?.temp) return null;
  return (w.main.temp - 273.15) * 1.8 + 32;
}

function groupMenu(items) {
  const map = {};
  for (const item of items) {
    if (!map[item.category]) map[item.category] = [];
    map[item.category].push(item);
  }
  for (const c of Object.keys(map)) {
    map[c].sort((a, b) => a.name.localeCompare(b.name));
  }
  return map;
}

export default function MenuBoard() {
  const [menu, setMenu] = useState([]);
  const [weather, setWeather] = useState(null);
  const [grouped, setGrouped] = useState({});
  const [categories, setCategories] = useState([]);
  const [recs, setRecs] = useState([]);
  const [mode, setMode] = useState("default");
  const [currentRecIndex, setCurrentRecIndex] = useState(0);

  // hydration-safe timestamp
  const [clientTime, setClientTime] = useState("");

  useEffect(() => {
    setClientTime(new Date().toLocaleString());
  }, []);

  useEffect(() => {
    async function load() {
      const m = await fetch("/api/menu").then((r) => r.json());
      const w = await fetch("/api/weather").then((r) => r.json());

      setMenu(m);
      setWeather(w);

      const g = groupMenu(m);
      setGrouped(g);

      const ordered = [
        ...CATEGORY_ORDER.filter((c) => g[c]),
        ...Object.keys(g).filter((c) => !CATEGORY_ORDER.includes(c)),
      ];
      setCategories(ordered);

      const temp = getTempF(w);
      const hour = new Date().getHours();

      const isLate = hour >= 20 || hour < 6;
      const isHot = temp !== null && temp >= 80;
      const isCold = temp !== null && temp <= 55;

      let pref = DEFAULT;
      let newMode = "default";

      if (isLate) {
        pref = LATE;
        newMode = "late";
      } else if (isHot) {
        pref = HOT;
        newMode = "hot";
      } else if (isCold) {
        pref = COLD;
        newMode = "cold";
      }

      const picks = [];
      const maxRecs = 5;

      for (const cat of pref) {
        for (const item of m) {
          if (item.category === cat) {
            if (!picks.some((p) => p.id === item.id)) {
              picks.push(item);
              if (picks.length >= maxRecs) break;
            }
          }
        }
        if (picks.length >= maxRecs) break;
      }

      if (picks.length < maxRecs) {
        for (const item of m) {
          if (!picks.some((p) => p.id === item.id)) {
            picks.push(item);
            if (picks.length >= maxRecs) break;
          }
        }
      }

      setMode(newMode);
      setRecs(picks);
      setCurrentRecIndex(0);
    }

    load();
  }, []);

  useEffect(() => {
    if (!recs || recs.length === 0) return;

    const t = setInterval(() => {
      setCurrentRecIndex((prev) => (prev + 1) % recs.length);
    }, 5000);

    return () => clearInterval(t);
  }, [recs]);

  const tempF = getTempF(weather);
  const desc = weather?.weather?.[0]?.description ?? "";
  const showHotBadge = mode === "cold";

  const currentRec =
    recs.length > 0 ? recs[currentRecIndex % recs.length] : null;

  const recImageSrc = currentRec
    ? `/images/${currentRec.id}.png`
    : "/images/default.png";

  return (
    <div className={styles.menuBoard}>
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Sharetea Digital Menu</h1>
          <div className={styles.subtitle}>
            Recommended drinks • Powered by live weather
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600, fontSize: "18px" }}>
            {tempF && `${Math.round(tempF)}°F • ${desc}`}
          </div>
          <div style={{ color: "#bbb", fontSize: "13px" }}>
            {clientTime}
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className={styles.main}>
        {/* LEFT: CATEGORY GRID */}
        <div className={styles.categoryGrid}>
          {categories.map((cat, i) => {
            const drinks = grouped[cat] || [];
            let span = "";

            if (i === 0) span = styles.wide;
            if (i === 1) span = styles.wide;

            if (i === 2) span = styles.medium;
            if (i === 3) span = styles.medium;
            if (i === 4) span = styles.medium;

            if (i === 5) span = styles.medium;
            if (i === 6) span = styles.small;

            return (
              <div key={cat} className={`${styles.categoryBox} ${span}`}>
                <div className={styles.categoryTitle}>{cat}</div>
                <div className={styles.categoryDivider}></div>

                {drinks.map((d) => (
                  <div className={styles.drinkItem} key={d.id}>
                    <span className={styles.drinkName}>{d.name}</span>
                    <span className={styles.dotted}></span>
                    <span>${Number(d.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* RIGHT: RECOMMENDED DRINKS */}
        <div className={styles.rightPanel}>
          <div className={styles.recommendHeader}>Recommended Drinks</div>

          <div className={styles.recommendSlider}>
            {currentRec ? (
              <div className={styles.recommendImageWrapper}>
                <img src={recImageSrc} alt={currentRec.name} />
                <div className={styles.recommendOverlay}>
                  <div className={styles.overlayTopRow}>
                    <span className={styles.overlayName}>
                      {currentRec.name}
                    </span>
                    <span className={styles.overlayPrice}>
                      ${Number(currentRec.price).toFixed(2)}
                    </span>
                  </div>

                  {showHotBadge && (
                    <span className={styles.hotBadge}>HOT</span>
                  )}

                  <div className={styles.overlayIndex}>
                    {currentRecIndex + 1} / {recs.length}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "#ccc",
                }}
              >
                No recommendations available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
