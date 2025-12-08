// pages/api/rewards.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { query } from "../../lib/db-connector";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userEmail = session.user.email;

  // ================================
  // GET → return user's loyalty points
  // ================================
  if (req.method === "GET") {
    try {
      const { rows } = await query(
        "SELECT loyaltyPoints FROM app_users WHERE userEmail = $1",
        [userEmail]
      );

      const points = rows[0]?.loyaltypoints ?? 0;

      return res.status(200).json({
        loyaltyPoints: points,
      });
    } catch (err) {
      console.error("Rewards GET error:", err);
      return res.status(500).json({ error: "Failed to load loyalty points" });
    }
  }

  // =========================================
  // POST → redeem points (subtract from user)
  // =========================================
  if (req.method === "POST") {
    try {
      const { points } = req.body;

      if (!points || points <= 0) {
        return res.status(400).json({ error: "Invalid point amount" });
      }

      await query(
        `
        UPDATE app_users
        SET loyaltyPoints = GREATEST(loyaltyPoints - $1, 0),
            loyaltyUpdatedAt = NOW()
        WHERE userEmail = $2
        `,
        [points, userEmail]
      );

      return res.status(200).json({
        success: true,
        redeemed: points,
      });
    } catch (err) {
      console.error("Rewards POST error:", err);
      return res.status(500).json({ error: "Failed to redeem points" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

