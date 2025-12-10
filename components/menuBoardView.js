// components/MenuBoardView.js
import React from "react";
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

export default function MenuBoardView({ menu, weather, clientTime }) {
  const grouped = groupMenu(menu || []);

  const categories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const tempF = getTempF(weather);
  const desc = weather?.weather?.[0]?.description ?? "";

  return (
    <div className={styles.menuBoard}>
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Sharetea Digital Menu</h1>
          <div className={styles.subtitle}>
            Full menu • Weather-aware recommendations available on rotation
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600, fontSize: "18px" }}>
            {tempF !== null && `${Math.round(tempF)}°F • ${desc}`}
          </div>
          <div style={{ color: "#bbb", fontSize: "13px" }}>{clientTime}</div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className={styles.main}>
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
      </div>
    </div>
  );
}
