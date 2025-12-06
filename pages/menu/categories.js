import { useState, useEffect } from "react";

export default function AutoCycleCategoriesPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();

        const formatted = data.map((item) => ({
          id: item.menuid ?? item.id,
          name: item.menuname ?? item.name,
          price: item.price,
          description: item.menudescription ?? item.description,
          category: item.category,
          image: `/Images/${item.menuid ?? item.id}.png`,
        }));

        setMenuItems(formatted);

        const categoryList = [
          ...new Set(formatted.map((item) => item.category)),
        ].sort();

        setCategories(categoryList);
      } catch (err) {
        console.error(err);
        setError("Failed to load menu.");
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;

    const interval = setInterval(() => {
      setCurrentCategoryIndex((prev) =>
        prev + 1 >= categories.length ? 0 : prev + 1
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [categories]);

  const currentCategory = categories[currentCategoryIndex] || null;

  const handlePress = (id) => {
    setSelectedItem(id);
    setTimeout(() => setSelectedItem(null), 200);
  };

  return (
    <div
      style={{
        backgroundColor: "#f8f0d7ff",
        minHeight: "100vh",
        padding: "20px",
        color: "#000",
      }}
    >
      <h1 style={{ textAlign: "center", fontSize: "40px" }}>
        {currentCategory || "Loading..."}
      </h1>

      {loading && <p>Loading menu...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && currentCategory && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "25px",
            marginTop: "20px",
            transition: "opacity 0.5s ease",
          }}
        >
          {menuItems
            .filter((item) => item.category === currentCategory)
            .map((item) => {
              const isSelected = selectedItem === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handlePress(item.id)}
                  style={{
                    backgroundColor: isSelected ? "#ffe680" : "#fff",
                    borderRadius: "15px",
                    boxShadow: isSelected
                      ? "0 0 0 4px #FFD700"
                      : "0 4px 10px rgba(0,0,0,0.15)",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    onError={(e) => (e.target.src = "/Images/default.png")}
                    style={{
                      width: "100%",
                      height: "200px",
                      borderRadius: "12px",
                      objectFit: "cover",
                      marginBottom: "15px",
                    }}
                  />

                  <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>
                    {item.name}
                  </h2>

                  <p style={{ fontSize: "18px", marginBottom: "8px" }}>
                    ${Number(item.price).toFixed(2)}
                  </p>

                  {item.description && (
                    <p style={{ fontSize: "14px", opacity: 0.8 }}>
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
}
