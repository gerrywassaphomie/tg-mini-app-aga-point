import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Раздаём файлы из public/
app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
