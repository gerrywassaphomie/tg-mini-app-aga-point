import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  const url = "https://www.stopice.net/login/?recentmapdata=1&duration=since_yesterday";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.stopice.net/login/?maps=1",
      },
    });

    const text = await response.text();
    const xml = `<root>${text}</root>`;
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);

    let arr = parsed.root?.map_data ?? [];
    if (!Array.isArray(arr)) arr = [arr];

    const points = arr.map((p) => ({
      id: p.id,
      lat: parseFloat(p.lat),
      lon: parseFloat(p.long),
      location: p.location || "",
      priority: p.thispriority || "",
      comments: p.comments || "",
      timestamp: p.timestamp || "",
      media: p.media || "",
      url: p.url || "",
    }));

    res.status(200).json(points);
  } catch (err) {
    console.error("Ошибка получения данных:", err);
    res.status(500).json({ error: "Ошибка загрузки данных" });
  }
}
