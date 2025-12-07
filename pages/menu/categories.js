import { useState, useEffect } from "react";

export default function AutoCycleCategoriesPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [boxHeight, setBoxHeight] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load menu
  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();

        const formatted = data.map((item) => ({
          id: item.menuid ?? item.id,
          name: item.menuname ?? item.name,
          price: item.price,
          category: item.category,
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

  // Calculate box height dynamically to fit 2x2 grid
  useEffect(() => {
    function updateBoxHeight() {
      const gap = 20; // same as grid gap
      const padding = 40; // container padding top + bottom
      const availableHeight = window.innerHeight - padding - gap;
      setBoxHeight(availableHeight / 2);
    }

    updateBoxHeight();
    window.addEventListener("resize", updateBoxHeight);
    return () => window.removeEventListener("resize", updateBoxHeight);
  }, []);

  // Cycle through categories and pages
  useEffect(() => {
    if (categories.length === 0) return;

    const interval = setInterval(() => {
      const currentCategory = categories[currentCategoryIndex];
      const items = menuItems.filter((i) => i.category === currentCategory);
      const totalPages = Math.ceil(items.length / itemsPerPage);

      if (currentPageIndex + 1 < totalPages) {
        setCurrentPageIndex((prev) => prev + 1);
      } else {
        setCurrentPageIndex(0);
        setCurrentCategoryIndex((prev) =>
          prev + 4 >= categories.length ? 0 : prev + 4
        );
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [categories, currentCategoryIndex, currentPageIndex, menuItems, itemsPerPage]);

  // Get current four categories
  const currentCategories = [
    categories[currentCategoryIndex],
    categories[currentCategoryIndex + 1] || null,
    categories[currentCategoryIndex + 2] || null,
    categories[currentCategoryIndex + 3] || null,
  ].filter(Boolean);

  return (
    <div
      style={{
        backgroundColor: "#f8f0d7ff",
        minHeight: "100vh",
        padding: "20px",
        color: "#000",
      }}
    >
      {loading && <p>Loading menu...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: "20px",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {currentCategories.map((cat, idx) => {
            const items = menuItems.filter((i) => i.category === cat);
            const pageIndex = idx === 0 ? currentPageIndex : 0;
            const itemsToShow = items.slice(
              pageIndex * itemsPerPage,
              (pageIndex + 1) * itemsPerPage
            );

            return (
              <div
                key={cat}
                style={{
                  backgroundColor: "#fff8dc",
                  borderRadius: "15px",
                  padding: "15px",
                  display: "flex",
                  flexDirection: "column",
                  height: `${boxHeight}px`,
                  overflow: "hidden",
                }}
              >
                <h1 style={{ textAlign: "center", fontSize: "24px" }}>{cat}</h1>
                <div style={{ marginTop: "10px", flexGrow: 1 }}>
                  {itemsToShow.map((item) => {
                    const price = `$${Number(item.price).toFixed(2)}`;
                    return (
                      <div
                        key={item.id}
                        style={{
                          fontSize: "18px",
                          marginBottom: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          whiteSpace: "nowrap",
                          fontFamily: "monospace",
                        }}
                      >
                        <span style={{ flexGrow: 1, overflow: "hidden" }}>
                          {item.name}
                          <span
                            style={{
                              borderBottom: "1px dashed #000",
                              margin: "0 8px",
                              width: "100%",
                              display: "inline-block",
                              transform: "translateY(-3px)",
                            }}
                          ></span>
                        </span>
                        <span>{price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
