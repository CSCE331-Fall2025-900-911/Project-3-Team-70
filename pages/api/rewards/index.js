// pages/api/rewards/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth].js";
import { query } from "../../../lib/db-connector.js";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const email = session.user.email;

  if (req.method === "GET") {
    try {
      const result = await query(
        "SELECT loyaltyPoints FROM app_users WHERE userEmail = $1",
        [email]
      );
      const loyaltyPoints =
        result.rows?.[0]?.loyaltypoints ??
        result.rows?.[0]?.loyaltyPoints ??
        0;

      return res.status(200).json({ loyaltyPoints });
    } catch (err) {
      console.error("Error fetching rewards:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch rewards" });
    }
  }

  if (req.method === "POST") {
    try {
      const { pointsEarned = 0, pointsSpent = 0 } = req.body || {};
      const earned = Number(pointsEarned) || 0;
      const spent = Number(pointsSpent) || 0;

      const updateResult = await query(
        `
        UPDATE app_users
        SET loyaltyPoints = GREATEST(
          COALESCE(loyaltyPoints, 0) + $1 - $2,
          0
        )
        WHERE userEmail = $3
        RETURNING loyaltyPoints
        `,
        [earned, spent, email]
      );

      const newPoints =
        updateResult.rows?.[0]?.loyaltypoints ??
        updateResult.rows?.[0]?.loyaltyPoints ??
        0;

      return res.status(200).json({
        success: true,
        loyaltyPoints: newPoints,
      });
    } catch (err) {
      console.error("Error updating rewards:", err);
      return res
        .status(500)
        .json({ error: "Failed to update rewards" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res
    .status(405)
    .json({ error: `Method ${req.method} not allowed` });
}
