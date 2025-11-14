export default async function handler(req, res) {
    const lat = 30.62195082680784;
    const lon = -96.32773129192775;
    const apiKey = process.env.OW_API_KEY;

    console.log("API KEY:", apiKey);
    console.log("LAT:", lat, "LON:", lon);

    // Build URL
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    console.log("URL:", url);

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch weather" });
    }
}