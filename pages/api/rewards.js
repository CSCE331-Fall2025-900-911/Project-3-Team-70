// pages/api/rewards.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { query } from "../../lib/db-connector";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.method === "GET") {
    const { rows } = await query(
      "SELECT loyaltyPoints FROM app_users WHERE userEmail = $1",
      [session.user.email]
    );
    const points = rows[0]?.loyaltypoints ?? 0;
    return res.status(200).json({ loyaltyPoints: points });
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
