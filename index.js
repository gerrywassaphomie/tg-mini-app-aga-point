import express from "express";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// === API для /api/fetchStopice ===
app.get("/api/fetchStopice", async (req, res) => {
  const url = "https://www.stopice.net/login/?recentmapdata=1&duration=since_yesterday";
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.stopice.net/login/?maps=1"
      }
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

    res.json(points);
  } catch (err) {
    console.error("Ошибка получения данных:", err);
    res.status(500).json({ error: "Ошибка загрузки данных" });
  }
});

// === Раздача фронтенда ===
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// === Экспорт для Vercel ===
export default app;
