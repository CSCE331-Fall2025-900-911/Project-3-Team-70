import { useState, useEffect } from "react";

export default function AutoCycleCategoriesPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [selectedItem, setSelectedItem] = useState(null);
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

  // Detect screen height and calculate items per page
  useEffect(() => {
    function updateItemsPerPage() {
      const availableHeight = window.innerHeight - 200; // header + padding buffer
      const itemHeight = 70; // approx height per item in px
      const perPage = Math.floor(availableHeight / itemHeight);
      setItemsPerPage(perPage > 0 ? perPage : 1);
    }

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
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
        // Move to next categories
        setCurrentPageIndex(0);
        setCurrentCategoryIndex((prev) =>
          prev + 2 >= categories.length ? 0 : prev + 2
        );
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [categories, currentCategoryIndex, currentPageIndex, menuItems, itemsPerPage]);

  const handlePress = (id) => {
    setSelectedItem(id);
    setTimeout(() => setSelectedItem(null), 200);
  };

  // Get current two categories
  const currentCategories = [
    categories[currentCategoryIndex],
    categories[currentCategoryIndex + 1] || null,
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
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "20px",
          }}
        >
          {currentCategories.map((cat) => {
            const items = menuItems.filter((i) => i.category === cat);
            const totalPages = Math.ceil(items.length / itemsPerPage);
            const pageIndex =
              cat === currentCategories[0] ? currentPageIndex : 0; // only paginate first category
            const itemsToShow = items.slice(
              pageIndex * itemsPerPage,
              (pageIndex + 1) * itemsPerPage
            );

            return (
              <div
                key={cat}
                style={{
                  flex: "1 1 300px",
                  maxWidth: "500px",
                  backgroundColor: "#fff8dc",
                  borderRadius: "15px",
                  padding: "15px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                <h1 style={{ textAlign: "center", fontSize: "28px" }}>
                  {cat}
                </h1>

                <div style={{ marginTop: "10px" }}>
                  {itemsToShow.map((item) => {
                    const isSelected = selectedItem === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handlePress(item.id)}
                        style={{
                          backgroundColor: isSelected ? "#ffe680" : "#fff",
                          borderRadius: "12px",
                          boxShadow: isSelected
                            ? "0 0 0 4px #FFD700"
                            : "0 2px 6px rgba(0,0,0,0.1)",
                          padding: "12px",
                          marginBottom: "10px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <h2 style={{ fontSize: "20px", margin: "0 0 5px 0" }}>
                          {item.name}
                        </h2>
                        <p style={{ fontSize: "16px", margin: 0 }}>
                          ${Number(item.price).toFixed(2)}
                        </p>
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
