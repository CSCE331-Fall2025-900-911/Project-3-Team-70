import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import styles from "./manager.module.css";  // CSS MODULE

function getMonthDay(dateInput) {
  const d = new Date(dateInput);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function toLocal(ts) {
  const d = new Date(ts);   // leave the Z, JS knows what to do
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
}

function getLocalYMD(ts) {
  const d = new Date(ts);
  return {
    y: d.getFullYear(),
    m: d.getMonth() + 1,
    d: d.getDate()
  };
}

function isSameLocalDay(tsA, tsB) {
  const a = getLocalYMD(tsA);
  const b = getLocalYMD(tsB);
  return a.y === b.y && a.m === b.m && a.d === b.d;
}


export default function ManagerPage() {
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesHourly, setSalesHourly] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
	const [activeTab, setActiveTab] = useState("sales");
	const [query, setQuery] = useState("");

	const [sales, setSales] = useState([]);

	const [menuItems, setMenuItems] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);

  const ALWAYS_INCLUDED_INGREDIENTS = [28, 29, 30, 31, 32];
  // ===== ADD MENU ITEM MODAL STATE =====
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);


  // ===== INVENTORY MODAL STATE =====
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [isEditingInventory, setIsEditingInventory] = useState(false);

  const [invID, setInvID] = useState(null);
  const [invName, setInvName] = useState("");
  const [invQty, setInvQty] = useState("");
  const [invUnit, setInvUnit] = useState("");
  const [invMin, setInvMin] = useState("");
  const [invAllergy, setInvAllergy] = useState("");
  const [invIsTopping, setInvIsTopping] = useState(false);

  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuCategory, setNewMenuCategory] = useState("");
  const [newMenuPrice, setNewMenuPrice] = useState("");
  const [newMenuDescription, setNewMenuDescription] = useState("");
  const [newMenuStart, setNewMenuStart] = useState("2025-01-01");
  const [newMenuEnd, setNewMenuEnd] = useState("2025-12-31");

  // Ingredients (not used yet)
  const [newMenuIngredients, setNewMenuIngredients] = useState([]);

  // Build category list from existing menu items
  const categories = useMemo(() => {
      const set = new Set();
      menuItems.forEach(m => {
          if (m.category) set.add(m.category);
      });
      return Array.from(set);
  }, [menuItems]);

	useEffect(() => {
	async function fetchMenuItems() {
    try {
		const response = await fetch("/api/menu");
		const data = await response.json();

		const today = new Date();

		setMenuItems(
			data.map(item => {

				const startMD = item.seasonalstart ? getMonthDay(item.seasonalstart) : null;
				const endMD   = item.seasonalend   ? getMonthDay(item.seasonalend)   : null;

				let seasonalDisplay = "All Year";

				if (startMD && endMD) {

					const isAllYear =
						startMD === "01-01" &&
						endMD === "12-31";

					if (!isAllYear) {
						const startStr = new Date(item.seasonalstart).toLocaleDateString(undefined, {
							month: "short",
							day: "numeric",
							year: "numeric"
						});

						const endStr = new Date(item.seasonalend).toLocaleDateString(undefined, {
							month: "short",
							day: "numeric",
							year: "numeric"
						});

						seasonalDisplay = `${startStr} - ${endStr}`;
					}
				}

        return {
          id: item.id,                // FIX
          name: item.name,            // FIX
          category: item.category,
          price: Number(item.price),
          description: item.description,  // OPTIONAL but recommended
          seasonal: seasonalDisplay,
          seasonalStart: item.seasonalstart,
          seasonalEnd: item.seasonalend,
          allergies: item.allergies       // OPTIONAL
        };
			})
		);

		} catch (err) {
			console.error("Failed to load menu:", err);
		}
	}

  fetchMenuItems();
}, []);


const [inventory, setInventory] = useState([]);


	// NEW — Report State =======================================
	const [xReportRows, setXReportRows] = useState([]);
	const [zReportRows, setZReportRows] = useState([]);

  // NEW — X REPORT (US Central Time, DST aware) ============================================
  async function generateXReport() {
    try {
      const res = await fetch("/api/sales");
      if (!res.ok) throw new Error("Failed to load sales");

      const data = await res.json();
      const orders = data.orders || [];

      // ====== HELPER: convert ISO string to Central Time Date ======
      function toCentral(dateStr) {
        const dt = new Date(dateStr);
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "numeric",
          hour12: false,
          minute: "numeric",
          second: "numeric",
        }).formatToParts(dt);

        const y = Number(parts.find(p => p.type === "year").value);
        const m = Number(parts.find(p => p.type === "month").value) - 1;
        const d = Number(parts.find(p => p.type === "day").value);
        const h = Number(parts.find(p => p.type === "hour").value);
        const min = Number(parts.find(p => p.type === "minute").value);
        const s = Number(parts.find(p => p.type === "second").value);

        return new Date(y, m, d, h, min, s); // local Date in Central Time
      }

      // ====== TODAY IN CENTRAL TIME ======
      const nowCentral = toCentral(new Date().toISOString());
      const startOfDay = new Date(
        nowCentral.getFullYear(),
        nowCentral.getMonth(),
        nowCentral.getDate(),
        0, 0, 0, 0
      );
      const endOfDay = new Date(
        nowCentral.getFullYear(),
        nowCentral.getMonth(),
        nowCentral.getDate(),
        23, 59, 59, 999
      );

      // ===== FILTER ORDERS BY TODAY (Central Time) =====
      const todaysOrders = orders.filter(o => {
        if (!o.orderdate) return false;
        const tsCentral = toCentral(o.orderdate);
        return tsCentral >= startOfDay && tsCentral <= endOfDay;
      });

      // ===== GROUP INTO HOURLY BLOCKS =====
      const hourlyMap = {};

      todaysOrders.forEach(order => {
        const tsCentral = toCentral(order.orderdate);
        const hour = tsCentral.getHours(); // hour in Central Time

        // Build AM/PM label
        const startHour12 = ((hour + 11) % 12) + 1;
        const endHour24 = hour + 1;
        const endHour12 = ((endHour24 + 11) % 12) + 1;

        const startSuffix = hour < 12 ? "AM" : "PM";
        const endSuffix = endHour24 < 12 ? "AM" : (endHour24 < 24 ? "PM" : "AM");

        const hourLabel = `${startHour12} ${startSuffix} – ${endHour12} ${endSuffix}`;

        if (!hourlyMap[hourLabel]) {
          hourlyMap[hourLabel] = {
            hour,
            hourLabel,
            revenue: 0,
          };
        }

        hourlyMap[hourLabel].revenue += Number(order.ordertotal || 0);
      });

      // ===== SORT AND MAP TO ROWS =====
      const rows = Object.values(hourlyMap)
        .sort((a, b) => a.hour - b.hour)
        .map(h => ({
          time: h.hourLabel,
          price: h.revenue,
          totalRow: false
        }));

      setZReportRows([]);
      setXReportRows(rows);

    } catch (err) {
      console.error("Error generating X-Report:", err);
    }
  }




  	// === LOAD REAL KIOSK ORDERS INTO SALES TAB ===

  useEffect(() => {
    async function loadInventory() {
      try {
        const invRes = await fetch("/api/inventory");
        if (!invRes.ok) return;

        const invJson = await invRes.json();

        const normalized = invJson.map(i => ({
          id: i.inventoryid,
          name: i.inventoryname,
          quantity: Number(i.quantityavailable || 0),
          restockMin: Number(i.restockmin || 0),
          unit: i.unit,
          allergy: i.allergy,
          restockOrdered: Number(i.restockordered || 0),
          isTopping: Boolean(i.istopping)   // ← add this
        }));

        setInventory(normalized);
      } catch (err) {
        console.error("Error loading inventory:", err);
      }
    }

    loadInventory();
  }, []);


  // NEW — Z REPORT (End of Day Reset, US Central Time aware) =========================
  async function generateZReport() {
    try {
      const res = await fetch("/api/sales");
      if (!res.ok) throw new Error("Failed to load sales");

      const data = await res.json();
      console.log("Sales data:", data);
      const orders = data.orders || [];

      // ====== HELPER: convert ISO string to Central Time Date ======
      function toCentral(dateStr) {
        const dt = new Date(dateStr);
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "numeric",
          hour12: false,
          minute: "numeric",
          second: "numeric",
        }).formatToParts(dt);

        const y = Number(parts.find(p => p.type === "year").value);
        const m = Number(parts.find(p => p.type === "month").value) - 1;
        const d = Number(parts.find(p => p.type === "day").value);
        const h = Number(parts.find(p => p.type === "hour").value);
        const min = Number(parts.find(p => p.type === "minute").value);
        const s = Number(parts.find(p => p.type === "second").value);

        return new Date(y, m, d, h, min, s); // Central Time date
      }

      // ====== TODAY IN CENTRAL TIME ======
      const nowCentral = toCentral(new Date().toISOString());
      const startOfDay = new Date(
        nowCentral.getFullYear(),
        nowCentral.getMonth(),
        nowCentral.getDate(),
        0, 0, 0, 0
      );
      const endOfDay = new Date(
        nowCentral.getFullYear(),
        nowCentral.getMonth(),
        nowCentral.getDate(),
        23, 59, 59, 999
      );

      // ===== FILTER ORDERS BY TODAY (Central Time) =====
      const todaysOrders = orders.filter(o => {
        if (!o.orderdate) return false;
        const tsCentral = toCentral(o.orderdate);
        return tsCentral >= startOfDay && tsCentral <= endOfDay;
      });

      // ===== COMPUTE TOTAL REVENUE =====
      const totalRevenue = todaysOrders.reduce(
        (sum, o) => sum + Number(o.ordertotal || 0),
        0
      );

      // ===== UPDATE STATE =====
      setXReportRows([]);
      setZReportRows([{ label: "Total Revenue", total: totalRevenue }]);

    } catch (err) {
      console.error("Error generating Z-Report:", err);
    }
  }





  // Filtering =========================================================
  const filteredMenu = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [query, menuItems]);

  const filteredInventory = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Hide all modifier-only inventory items
    const visible = inventory.filter(i => i.unit !== "mod" && i.unit !== "archived")

    if (!q) return visible;

    return visible.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        String(i.quantity).includes(q)
    );
  }, [query, inventory]);

// Event Handlers ===================================================
function handleAddMenuItem() {
  // Pre-load auto-included ingredients
  setNewMenuIngredients(
    ALWAYS_INCLUDED_INGREDIENTS.map(id => ({
      inventoryID: id,
      quantity: 1    // or 0 if you prefer
    }))
  );

  setIsEditingMenu(false);
  setShowAddMenuModal(true);
}

async function handleUpdateMenuItem() {
  if (!selectedMenuItem) {
    alert("Select a menu item to update.");
    return;
  }

  setIsEditingMenu(true);

  // Prefill modal fields
  setNewMenuName(selectedMenuItem.name);
  setNewMenuCategory(selectedMenuItem.category);
  setNewCategoryInput("");
  setNewMenuPrice(selectedMenuItem.price);
  setNewMenuDescription(selectedMenuItem.description || "");
  setNewMenuStart(selectedMenuItem.seasonalStart?.slice(0, 10));
  setNewMenuEnd(selectedMenuItem.seasonalEnd?.slice(0, 10));

  // === LOAD INGREDIENTS FROM DB ===
  try {
    const res = await fetch(`/api/menu/ingredients?menuID=${selectedMenuItem.id}`);
    const ingredients = await res.json();

    // Correct quantity field mapping
    setNewMenuIngredients(
      ingredients.map(i => ({
        inventoryID: i.inventoryid,
        quantity: Number(i.quantity || 0)
      }))
    );
  } catch (err) {
    console.error("Error loading ingredients:", err);
  }

  // Only show modal after data is fully loaded
  setShowAddMenuModal(true);
}

  function handleAddInventory() {
    setIsEditingInventory(false);

    setInvID(null);
    setInvName("");
    setInvQty("");
    setInvUnit("");
    setInvMin("");
    setInvAllergy("");

    setShowInventoryModal(true);
  }

  function handleUpdateInventory() {
    alert("Click an inventory row first to update it.");
  }

  async function handleDeleteMenuItem() {
    if (!selectedMenuId) {
      alert("Please select a menu item to delete.");
      return;
    }

    const ok = confirm("Are you sure you want to delete this menu item?");
    if (!ok) return;

    try {
      const res = await fetch("/api/menu/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuID: selectedMenuId })
      });

      if (!res.ok) {
        alert("Failed to delete item.");
        return;
      }

      alert("Menu item deleted.");

      // Reload menu items
      const refreshed = await fetch("/api/menu");
      const updatedData = await refreshed.json();

      setMenuItems(
        updatedData.map(item => {
          const startMD = item.seasonalstart ? getMonthDay(item.seasonalstart) : null;
          const endMD   = item.seasonalend   ? getMonthDay(item.seasonalend)   : null;

          let seasonalDisplay = "All Year";

          if (startMD && endMD) {
            const isAllYear =
              startMD === "01-01" &&
              endMD === "12-31";

            if (!isAllYear) {
              const startStr = new Date(item.seasonalstart).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric"
              });

              const endStr = new Date(item.seasonalend).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric"
              });

              seasonalDisplay = `${startStr} - ${endStr}`;
            }
          }

          return {
            id: item.id,
            name: item.name,
            category: item.category,
            price: Number(item.price),
            seasonalStart: item.seasonalstart,
            seasonalEnd: item.seasonalend,
            seasonal: seasonalDisplay,
            description: item.description
          };
        })
      );


      setSelectedMenuId(null);

    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting menu item.");
    }
  }


  async function handleOrderRestock(item) {
    const amount = prompt(`How many ${item.unit} of ${item.name}?`);
    if (!amount || isNaN(amount) || amount <= 0) return;

    const newAmount = item.restockOrdered + Number(amount);

    const res = await fetch("/api/inventory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        restockMin: item.restockMin,
        unit: item.unit,
        allergy: item.allergy,
        restockOrdered: newAmount   // <--- MUST send this
      }),
    });

    refreshInventory();
  }

  async function completeRestock(item) {
    const amount = item.restockOrdered;
    if (amount <= 0) return;

    const res = await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, amount }),
    });

    if (!res.ok) {
      alert("Failed to complete restock.");
      return;
    }

    refreshInventory();
  }

  async function refreshInventory() {
    const invRes = await fetch("/api/inventory");
    const invJson = await invRes.json();

    const normalized = invJson.map(i => ({
      id: i.inventoryid,
      name: i.inventoryname,
      quantity: Number(i.quantityavailable || 0),
      restockMin: Number(i.restockmin || 0),
      unit: i.unit,
      allergy: i.allergy,
      restockOrdered: Number(i.restockordered || 0),
      isTopping: Boolean(i.istopping)
    }));

    setInventory(normalized);
  }

  async function submitNewMenuItem() {
    if (newMenuIngredients.length === 0) {
      if (!confirm("This item has NO ingredients. Continue?")) {
          return;
      }
  }
    let categoryToSave = newMenuCategory;

    if (categoryToSave === "__new__") {
        if (!newCategoryInput.trim()) {
            alert("Please enter a new category name.");
            return;
        }
        categoryToSave = newCategoryInput.trim();
    }
      try {
        const payload = {
          name: newMenuName,
          category: categoryToSave,
          price: parseFloat(newMenuPrice),
          seasonalStart: `${newMenuStart} 00:00:00`,
          seasonalEnd: `${newMenuEnd} 23:59:59`,
          description: newMenuDescription,
          ingredients: newMenuIngredients
        };
        // If editing, send update instead of create
        if (isEditingMenu) {
          const updatePayload = {
            id: selectedMenuItem.id,
            name: newMenuName,
            category: categoryToSave,
            price: parseFloat(newMenuPrice),
            description: newMenuDescription,
            seasonalStart: `${newMenuStart} 00:00:00`,
            seasonalEnd: `${newMenuEnd} 23:59:59`,
            ingredients: newMenuIngredients   // ← REQUIRED FIX
          };

          const res = await fetch("/api/menu/update", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          });

          if (!res.ok) {
            alert("Error updating menu item.");
            return;
          }

          alert("Menu item updated!");

          setIsEditingMenu(false);
          setShowAddMenuModal(false);

          // Reload menu items
          const refreshed = await fetch("/api/menu");
          const updated = await refreshed.json();

          setMenuItems(
            updated.map(item => {
              const startMD = item.seasonalstart ? getMonthDay(item.seasonalstart) : null;
              const endMD   = item.seasonalend   ? getMonthDay(item.seasonalend)   : null;

              let seasonalDisplay = "All Year";

              if (startMD && endMD) {
                const isAllYear =
                  startMD === "01-01" &&
                  endMD === "12-31";

                if (!isAllYear) {
                  const startStr = new Date(item.seasonalstart).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  });

                  const endStr = new Date(item.seasonalend).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  });

                  seasonalDisplay = `${startStr} - ${endStr}`;
                }
              }

              return {
                id: item.id,
                name: item.name,
                category: item.category,
                price: Number(item.price),
                seasonalStart: item.seasonalstart,
                seasonalEnd: item.seasonalend,
                seasonal: seasonalDisplay,
                description: item.description
              };
            })
          );

          return;
        }



          const res = await fetch("/api/menu/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
          });

          if (!res.ok) {
              alert("Error adding menu item.");
              return;
          }

          alert("Menu item added!");
          setShowAddMenuModal(false);

          // Reload menu after adding
          const refreshed = await fetch("/api/menu");
          const updatedData = await refreshed.json();
          setMenuItems(
            updatedData.map(item => {
              const startMD = item.seasonalstart ? getMonthDay(item.seasonalstart) : null;
              const endMD   = item.seasonalend   ? getMonthDay(item.seasonalend)   : null;

              let seasonalDisplay = "All Year";
              if (startMD && endMD) {
                const isAllYear = startMD === "01-01" && endMD === "12-31";
                if (!isAllYear) {
                  const startStr = new Date(item.seasonalstart).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric"
                  });
                  const endStr = new Date(item.seasonalend).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric"
                  });
                  seasonalDisplay = `${startStr} - ${endStr}`;
                }
              }

              return {
                id: item.id,
                name: item.name,
                category: item.category,
                price: Number(item.price),
                seasonal: seasonalDisplay,
                seasonalStart: item.seasonalstart,
                seasonalEnd: item.seasonalend
              };
            })
          );


      } catch (err) {
          console.error("Failed to add menu item:", err);
      }
  }

  async function submitInventoryChanges() {
    const payload = {
      id: invID,
      name: invName,
      quantity: Number(invQty),
      restockMin: Number(invMin),
      unit: invUnit,
      allergy: invAllergy || null,
      restockOrdered: isEditingInventory ? inventory.find(x => x.id === invID)?.restockOrdered || 0 : 0,
      isTopping: invIsTopping
    };

    const method = isEditingInventory ? "PUT" : "POST";

    const res = await fetch("/api/inventory", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Error saving inventory.");
      return;
    }

    setShowInventoryModal(false);

    const refreshed = await fetch("/api/inventory");
    const updated = await refreshed.json();

    setInventory(
      updated.map((i) => ({
        id: i.inventoryid,
        name: i.inventoryname,
        quantity: Number(i.quantityavailable || 0),
        restockMin: Number(i.restockmin || 0),
        unit: i.unit,
        allergy: i.allergy,
        restockOrdered: Number(i.restockordered || 0),
        isTopping: i.istopping
      }))
    );
  } 

  function toggleIngredient(id, checked) {
    if (checked) {
      // Add if not present
      setNewMenuIngredients(prev => [
        ...prev,
        { inventoryID: id, quantity: 0 }
      ]);
    } else {
      // Remove it
      setNewMenuIngredients(prev =>
        prev.filter(i => i.inventoryID !== id)
      );
    }
  }

  function updateIngredientQty(id, qty) {
    setNewMenuIngredients(prev =>
      prev.map(i =>
        i.inventoryID === id ? { ...i, quantity: qty } : i
      )
    );
  }


  // TAB COMPONENTS ===================================================
// ===== SALES TAB =====


// Fetch sales data (with range or all-time)

async function handleDeleteInventory() {
  if (!invID) {
    alert("Select an inventory item first.");
    return;
  }

  const ok = confirm(
    "This will delete this inventory item. Continue?"
  );
  if (!ok) return;

  const res = await fetch("/api/inventory", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: invID,
      name: invName,
      quantity: invQty,
      restockMin: invMin,
      unit: "archived",          // ← THIS IS THE DELETE
      allergy: invAllergy || null,
      restockOrdered: 0,
      isTopping: false
    }),
  });

  if (!res.ok) {
    alert("Failed to delete inventory item.");
    return;
  }

  setShowInventoryModal(false);
  refreshInventory();
}


async function fetchSales() {
	try {
		setSalesLoading(true);
		setSalesError(null);

		let url = "/api/sales";

		if (startDate && endDate) {
			url += `?start=${startDate} 00:00:00&end=${endDate} 23:59:59`;
		}

		const res = await fetch(url);
		if (!res.ok) throw new Error("HTTP " + res.status);

		const data = await res.json();
		setSalesSummary(data.summary || null);
		setSalesHourly(data.hourly || []);
		setSalesOrders(data.orders || []);
		} catch (err) {
		console.error("Failed to fetch sales:", err);
		setSalesError("Failed to load sales data.");
		} finally {
		setSalesLoading(false);
	}
}

// Run once on initial load
useEffect(() => {
  fetchSales();
}, []);

// Render Sales tab
	const SalesTab = (
	<section className={styles.panel}>
	<h2>Sales</h2>
  <input
    type="search"
    placeholder="Search (item/date)…"
    className={styles.search}
    value={query}
    onChange={(e) => setQuery(e.target.value)}
  />


	{/* Date Range Controls */}
	<div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
		<div>
		<label>Start Date</label>
		<input
			type="date"
			value={startDate}
			onChange={(e) => setStartDate(e.target.value)}
		/>
		</div>

		<div>
		<label>End Date</label>
		<input
			type="date"
			value={endDate}
			onChange={(e) => setEndDate(e.target.value)}
		/>
		</div>

		<button onClick={fetchSales}>Generate</button>
	</div>

	{/* Loading & Errors */}
	{salesLoading && <p>Loading sales...</p>}
	{salesError && <p style={{ color: "red" }}>{salesError}</p>}

	{/* Summary */}
	{salesSummary && !salesLoading && (
		<div className={styles.summaryBox}>
		<p><strong>Total Sales:</strong> ${Number(salesSummary.totalsales).toFixed(2)}</p>
		<p><strong>Total Orders:</strong> {salesSummary.totalorders}</p>
		<p><strong>First Order:</strong> {salesSummary.firstorder ? new Date(salesSummary.firstorder).toLocaleString() : "—"}</p>
		<p><strong>Last Order:</strong> {salesSummary.lastorder ? new Date(salesSummary.lastorder).toLocaleString() : "—"}</p>
		</div>
	)}

	{/* Orders Table */}
	{salesOrders.length > 0 && (
		<div className={styles.tableWrap}>
		<table className={styles.table}>
			<thead>
			<tr>
				<th>Order ID</th>
				<th>Location</th>
				<th>Date</th>
				<th>Total ($)</th>
			</tr>
			</thead>
			<tbody>
			{salesOrders
				.filter((row) => {
				const q = query.trim().toLowerCase();
				if (!q) return true;

				return (
					String(row.orderid).includes(q) ||
					(row.orderlocation || "").toLowerCase().includes(q) ||
					(row.orderdate || "").toString().includes(q)
				);
				})
				.map((row) => (
				<tr key={row.orderid}>
					<td>{row.orderid}</td>
					<td>{row.orderlocation}</td>
					<td>
					{row.orderdate
						? new Date(row.orderdate).toLocaleString()
						: ""}
					</td>
					<td>{Number(row.ordertotal).toFixed(2)}</td>
				</tr>
				))}
			</tbody>
		</table>
		</div>
	)}
	</section>
);


	const MenuTab = (
	<section className={styles.panel}>
		<div className={styles.panelHeader}>
		<h2>Menu Items</h2>
    <div className={styles.actions}>
      <button className={`${styles.btn} ${styles.primary}`} onClick={handleAddMenuItem}>Add</button>
      <button className={styles.btn} onClick={handleUpdateMenuItem}>Update</button>
      <button className={`${styles.btn} ${styles.danger}`} onClick={handleDeleteMenuItem}>Delete</button>
    </div>

		</div>

		<input
		type="search"
		placeholder="Search menu…"
		className={styles.search}
		value={query}
		onChange={(e) => setQuery(e.target.value)}
		/>

		<div className={styles.tableWrap}>
		<table className={styles.table}>
			<thead>
			<tr>
				<th>Name</th><th>Category</th><th>Price ($)</th><th>Seasonal</th>
			</tr>
			</thead>
			<tbody>
			{filteredMenu.map((m) => (
				<tr
          key={m.id}
          onClick={() => {
            setSelectedMenuId(m.id);
            setSelectedMenuItem(m);   // <-- needed for update
          }}

          className={selectedMenuId === m.id ? styles.selectedRow : ""}
          style={{ cursor: "pointer" }}
        >

				<td>{m.name}</td>
				<td>{m.category}</td>
				<td>{m.price.toFixed(2)}</td>
				<td>{m.seasonal}</td>

				</tr>
			))}
			</tbody>
		</table>
		</div>
	</section>
	);

  const InventoryTab = (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Inventory</h2>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={handleAddInventory}>Add</button>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search inventory…"
        className={styles.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={styles.tableWrap}>
        <table className={styles.table}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Min</th>
          </tr>
        </thead>
          <tbody>
            {filteredInventory.map((i) => (
              <tr
                key={i.id}
                onClick={() => {
                  setIsEditingInventory(true);
                  setInvID(i.id);
                  setInvName(i.name);
                  setInvQty(i.quantity);
                  setInvUnit(i.unit);
                  setInvMin(i.restockMin);
                  setInvAllergy(i.allergy || "");
                  setShowInventoryModal(true);
                  setInvIsTopping(i.isTopping ?? false);
                }}
                style={{ cursor: "pointer" }}
              >
                <td>{i.name}</td>
                <td>{i.quantity}</td>
                <td>{i.unit}</td>
                <td>{i.restockMin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const RestockTab = (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Order Restocks</h2>
      </div>

      <ul className={styles.restockList}>
        {inventory
          .filter(i => i.unit !== "mod" && i.unit !== "archived")
          .map((i) => (
          <li key={i.id} className={styles.restockItem}>
            <div className={styles.restockMain}>
              <span className={styles.restockName}>{i.name}</span>
              <span className={styles.restockMeta}>
                Current: {i.quantity} {i.unit} | Min: {i.restockMin} {i.unit}
              </span>

              {Number(i.quantity) < Number(i.restockMin) && (
                <span style={{ color: "red", fontWeight: "bold" }}>
                  ⚠ Needs Restocking
                </span>
              )}

              {i.restockOrdered > 0 && (
                <span className={styles.restockPending}>
                  Pending Restock: {i.restockOrdered} {i.unit}
                </span>
              )}
            </div>

            <div className={styles.restockButtons}>
              {/* ORDER MORE */}
              <button
                className={`${styles.btn} ${styles.success}`}
                onClick={() => handleOrderRestock(i)}
              >
                Order
              </button>

              {/* COMPLETE RESTOCK (Only if pending) */}
              {i.restockOrdered > 0 && (
                <button
                  className={`${styles.btn} ${styles.primary}`}
                  onClick={() => completeRestock(i)}
                >
                  Complete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );


  // NEW — REPORTS TAB ============================================
  const ReportsTab = (
    <section className={styles.panel}>
      <h2>Reports</h2>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <button
          className={styles.btn}
          style={{ backgroundColor: "#900", color: "#fff", marginLeft: "10px" }}
          onClick={generateXReport}
        >
          Run X Report
        </button>

        <button
          className={styles.btn}
          style={{ backgroundColor: "#900", color: "#fff", marginLeft: "10px" }}
          onClick={generateZReport}
        >
          Run Z Report
        </button>
      </div>

      {/* X REPORT TABLE */}
      {xReportRows.length > 0 && (
        <div className={styles.tableWrap}>
          <h3>
            X-Report — {new Date().toLocaleDateString()}
          </h3>
      
          <table className={styles.table}>
          <thead>
            <tr>
              <th>Hour</th>
              <th>Total ($)</th>
            </tr>
          </thead>
          <tbody>
            {xReportRows.map((row, index) => (
              <tr
                key={index}
                style={row.totalRow ? { fontWeight: "bold", background: "#eee" } : {}}
              >
                <td>{row.time}</td>
                <td>{row.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}

      {/* Z REPORT TABLE */}
      {zReportRows.length > 0 && (
        <div className={styles.tableWrap} style={{ marginTop: "30px" }}>
          <h3>
            Z-Report — {new Date().toLocaleDateString()}
          </h3>
      
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Total ($)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ fontWeight: "bold"}}>
                <td>{zReportRows[0].label}</td>
                <td>{zReportRows[0].total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  // MAIN RENDER ======================================================
  return (
    <div className={styles.wrap}>
      <header className={styles.topbar}>
        <h1 className={styles.title}>Manager Dashboard</h1>

        <nav className={styles.links}>
          <Link className={styles.link} href="/cashier">Cashier</Link>
          <Link className={styles.link} href="/kiosk">Kiosk</Link>
        </nav>
      </header>

     {showAddMenuModal && (
      <div className={styles.modalBackdrop}>
        <div className={styles.modal}>

          {/* === TOP FORM BOX (narrower) === */}
          <div className={styles.topBox}>
            <h2>Add Menu Item</h2>

            <div className={styles.modalField}>
              <label>Name</label>
              <input
                type="text"
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
              />
            </div>

            <div className={styles.modalField}>
              <label>Category</label>
              <select
                value={newMenuCategory}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewMenuCategory(value);

                  // If they choose “Add New Category”, clear the input
                  if (value === "__new__") {
                    setNewCategoryInput("");
                  }
                }}
              >
                <option value="">Select category...</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__new__">+ Add New Category</option>
              </select>

              {/* Text box appears AND stays visible */}
              {newMenuCategory === "__new__" && (
                <input
                  type="text"
                  placeholder="Enter new category"
                  style={{ marginTop: "8px" }}
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                />
              )}

            </div>

            <div className={styles.modalField}>
              <label>Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={newMenuPrice}
                onChange={(e) => setNewMenuPrice(e.target.value)}
              />
            </div>

            <div className={styles.modalField}>
              <label>Description</label>
              <textarea
                value={newMenuDescription}
                onChange={(e) => setNewMenuDescription(e.target.value)}
                rows={4}
                style={{ width: "100%", resize: "vertical" }}
                placeholder="Enter menu item description…"
              />
            </div>

            <div className={styles.modalRow}>
              <div className={styles.modalField}>
                <label>Seasonal Start</label>
                <input
                  type="date"
                  value={newMenuStart}
                  onChange={(e) => setNewMenuStart(e.target.value)}
                />
              </div>

              <div className={styles.modalField}>
                <label>Seasonal End</label>
                <input
                  type="date"
                  value={newMenuEnd}
                  onChange={(e) => setNewMenuEnd(e.target.value)}
                />
              </div>
            </div>
          </div>


          {/* === INGREDIENT PANEL (full width, separate box) === */}
          <div className={styles.ingredientBox}>
            <h3>Ingredients</h3>

            <div className={styles.ingredientGrid}>
              {inventory
                  .filter(inv => inv.unit !== "mod")
                  .filter(inv => inv.id !== 33) 
                  .filter(inv => !ALWAYS_INCLUDED_INGREDIENTS.includes(inv.id))
                .map(inv => {
                const selected = newMenuIngredients.find(i => i.inventoryID === inv.id);

                return (
                  <div key={inv.id} className={styles.ingredientCell}>
                    <label className={styles.ingredientLabel}>
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={(e) =>
                          toggleIngredient(inv.id, e.target.checked)
                        }
                      />
                      {inv.name} ({inv.unit})
                    </label>

                    {selected && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={styles.qtyInput}
                        value={selected.quantity}
                        onChange={(e) =>
                          updateIngredientQty(inv.id, Number(e.target.value))
                        }
                        placeholder="Qty"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>


          {/* ACTION BUTTONS */}
          <div className={styles.modalButtons}>
            <button onClick={() => {
              setShowAddMenuModal(false);
              setIsEditingMenu(false);
            }}>Cancel</button>
            <button className={styles.primary} onClick={submitNewMenuItem}>
              {isEditingMenu ? "Update Item" : "Add Item"}
            </button>
          </div>

        </div>

              </div>
    )}

    {showInventoryModal && (
      <div className={styles.modalBackdrop}>
        <div className={styles.modal}>

          <h2>{isEditingInventory ? "Update Inventory Item" : "Add Inventory Item"}</h2>

          <div className={styles.modalField}>
            <label>Name</label>
            <input
              type="text"
              value={invName}
              onChange={(e) => setInvName(e.target.value)}
            />
          </div>

          <div className={styles.modalField}>
            <label>Quantity</label>
            <input
              type="number"
              value={invQty}
              onChange={(e) => setInvQty(e.target.value)}
            />
          </div>

          <div className={styles.modalField}>
            <label>Unit</label>
            <input
              type="text"
              value={invUnit}
              onChange={(e) => setInvUnit(e.target.value)}
            />
          </div>

          <div className={styles.modalField}>
            <label>Restock Minimum</label>
            <input
              type="number"
              value={invMin}
              onChange={(e) => setInvMin(e.target.value)}
            />
          </div>

          <div className={styles.modalField}>
            <label>
              <input
                type="checkbox"
                checked={invIsTopping}
                onChange={(e) => setInvIsTopping(e.target.checked)}
              />
              Is Topping?
            </label>
          </div>
          <div className={styles.modalField}>
            <label>Allergy (optional)</label>
            <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
              {/* DAIRY */}
              <label>
                <input
                  type="checkbox"
                  checked={invAllergy?.includes("Dairy")}
                  onChange={(e) => {
                    let a = invAllergy ? invAllergy.split(",") : [];
                    if (e.target.checked) {
                      if (!a.includes("Dairy")) a.push("Dairy");
                    } else {
                      a = a.filter((x) => x !== "Dairy");
                    }
                    setInvAllergy(a.join(","));
                  }}
                />
                Dairy
              </label>
                
              {/* NUTS */}
              <label>
                <input
                  type="checkbox"
                  checked={invAllergy?.includes("Nuts")}
                  onChange={(e) => {
                    let a = invAllergy ? invAllergy.split(",") : [];
                    if (e.target.checked) {
                      if (!a.includes("Nuts")) a.push("Nuts");
                    } else {
                      a = a.filter((x) => x !== "Nuts");
                    }
                    setInvAllergy(a.join(","));
                  }}
                />
                Nuts
              </label>
            </div>
          </div>

          <div className={styles.modalButtons}>
            <button onClick={() => setShowInventoryModal(false)}>Cancel</button>

            {isEditingInventory && (
              <button
                className={styles.danger}
                onClick={handleDeleteInventory}
              >
                Delete
              </button>
            )}

            <button className={styles.primary} onClick={submitInventoryChanges}>
              {isEditingInventory ? "Update" : "Add"}
            </button>
          </div>

        </div>
      </div>
    )}

      <main className={styles.layout}>
        <aside className={styles.sidebar}>
          <button
            className={`${styles.tab} ${activeTab === "sales" ? styles.active : ""}`}
            onClick={() => setActiveTab("sales")}
          >
            Sales
          </button>

          <button
            className={`${styles.tab} ${activeTab === "menu" ? styles.active : ""}`}
            onClick={() => setActiveTab("menu")}
          >
            Menu Items
          </button>

          <button
            className={`${styles.tab} ${activeTab === "inventory" ? styles.active : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            Inventory
          </button>

          <button
            className={`${styles.tab} ${activeTab === "restock" ? styles.active : ""}`}
            onClick={() => setActiveTab("restock")}
          >
            Restocks
          </button>

          {/*REPORTS TAB */}
          <button
            className={`${styles.tab} ${activeTab === "reports" ? styles.active : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </button>
        </aside>

        <section className={styles.content}>
          {activeTab === "sales" && SalesTab}
          {activeTab === "menu" && MenuTab}
          {activeTab === "inventory" && InventoryTab}
          {activeTab === "restock" && RestockTab}
          {activeTab === "reports" && ReportsTab}
        </section>
      </main>
    </div>
  );
}