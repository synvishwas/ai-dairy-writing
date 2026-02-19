import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("diary.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    summary TEXT,
    learning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/entries", (req, res) => {
    const entries = db.prepare("SELECT * FROM entries ORDER BY created_at DESC").all();
    res.json(entries);
  });

  app.post("/api/entries", (req, res) => {
    const { content, summary, learning } = req.body;
    const info = db.prepare("INSERT INTO entries (content, summary, learning) VALUES (?, ?, ?)").run(content, summary, learning);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/preferences", (req, res) => {
    const prefs = db.prepare("SELECT * FROM preferences").all();
    const prefsObj = prefs.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(prefsObj);
  });

  app.post("/api/preferences", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
