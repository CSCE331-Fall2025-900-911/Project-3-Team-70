// components/featuredDrinkView.js
import React from "react";
import headerStyles from "../styles/menuboard.module.css";
import styles from "../styles/featuredDrink.module.css";

function getTempF(w) {
  if (!w?.main?.temp) return null;
  return (w.main.temp - 273.15) * 1.8 + 32;
}

const MODE_LABELS = {
  hot: "Hot Day Picks",
  cold: "Warm You Up",
  late: "Late Night Favorites",
  default: "Fan Favorites",
};

export default function FeaturedDrinkView({
  drink,
  weather,
  clientTime,
  mode,
  index,
  total,
  overrideOpen,
  setOverrideOpen
}) {
  const tempF = getTempF(weather);
  const desc = weather?.weather?.[0]?.description ?? "";

  const hasDrink = !!drink;

  const imageSrc =
    hasDrink &&
    typeof drink.id === "number" &&
    drink.id >= 0 &&
    drink.id <= 38
      ? `/images/${drink.id}.png`
      : "/images/default.png";

  const allergies = Array.isArray(drink?.allergies)
    ? drink.allergies.filter(Boolean)
    : [];

  const modeLabel = MODE_LABELS[mode] || MODE_LABELS.default;
  const showHotBadge = mode === "cold";

  return (
    <div className={styles.featuredRoot}>
      {/* HEADER: same structure as menu board, new title */}
      <div className={headerStyles.header}>
        <div>
          <h1 className={headerStyles.title}>Recommendations</h1>
          <div className={headerStyles.subtitle}>
            Recommended drinks • Based on live weather & time of day
          </div>
        </div>

        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ fontWeight: 600, fontSize: "18px" }}>
            {tempF !== null && `${Math.round(tempF)}°F • ${desc}`}
          </div>
          <div style={{ color: "#bbb", fontSize: "13px", marginBottom: "4px" }}>
            {clientTime}
          </div>

          {/* Override Button (Demo Mode) */}
          <button
            onClick={() => setOverrideOpen(!overrideOpen)}
            style={{
              padding: "4px 10px",
              background: "#333",
              color: "white",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #666",
              cursor: "pointer",
              opacity: 0.8
            }}
          >
            {overrideOpen ? "Hide Demo Controls" : "Demo Mode"}
          </button>
        </div>

      </div>

      {/* BODY */}
      <div className={styles.featuredBody}>
        {!hasDrink ? (
          <div className={styles.emptyState}>
            No recommendations available at this time.
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.imageWrapper}>
              <img src={imageSrc} alt={drink.name} />
            </div>

            <div className={styles.info}>
              <div className={styles.name}>{drink.name}</div>
              <div className={styles.price}>
                ${Number(drink.price).toFixed(2)}
              </div>

              {showHotBadge && (
                <div className={styles.tagsRow}>
                  <span className={styles.badge}>Order it hot!</span>
                </div>
              )}

              {drink.description && (
                <div className={styles.description}>{drink.description}</div>
              )}

              <div className={styles.tagsRow}>
                <span className={styles.allergyChip}>*Ask about allergy information</span>
                </div>


              <div className={styles.metaRow}>
                <span className={styles.modeLabel}>{modeLabel}</span>
                <span className={styles.indexIndicator}>
                  {index + 1} / {Math.max(total, 1)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
