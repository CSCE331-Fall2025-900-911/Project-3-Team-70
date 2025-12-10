export default async function handler(req, res) {
  try {
    const placeId = "ChIJl47z-XeDRoYRUfI28mv1vS0"; // CORRECT ShareTea business place_id

    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${placeId}` +
      `&fields=name,rating,user_ratings_total,reviews` +
      `&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.result) {
      return res.status(404).json({ error: "Business not found" });
    }

    const { name, rating, user_ratings_total, reviews } = data.result;

    // Filter for positive reviews, sort by recency, take 4
    const filtered = (reviews || [])
      .filter(r => r.rating >= 3)
      .sort((a, b) => b.time - a.time)
      .slice(0, 4);

    res.status(200).json({
      name,
      rating,
      totalReviews: user_ratings_total,
      reviews: filtered,
    });

  } catch (err) {
    console.error("Google Reviews API error:", err);
    res.status(500).json({ error: "Failed to fetch Google reviews" });
  }
}
