// pages/menuboard.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import MenuBoardView from "../components/menuBoardView";

export default function MenuboardPage() {
  const router = useRouter();
  const [menu, setMenu] = useState([]);
  const [weather, setWeather] = useState(null);
  const [clientTime, setClientTime] = useState("");

  useEffect(() => {
    setClientTime(new Date().toLocaleString());
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [mRes, wRes] = await Promise.all([
          fetch("/api/menu"),
          fetch("/api/weather"),
        ]);

        const [m, w] = await Promise.all([mRes.json(), wRes.json()]);
        setMenu(m);
        setWeather(w);
      } catch (err) {
        console.error("Failed to load menuboard data:", err);
      }
    }

    load();
  }, []);

  if (!menu.length) {
    return null; // or skeleton if you want
  }

  return (
    <>
      <MenuBoardView menu={menu} weather={weather} clientTime={clientTime} router={router} />
    </>
  );
}
