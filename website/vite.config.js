import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { buildCatalog, readNote } from "./catalog.js";

function notesApi() {
  function attach(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/api/catalog") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(buildCatalog()));
        return;
      }
      if (url.pathname === "/api/file") {
        const note = readNote(url.searchParams.get("path") || "");
        if (!note) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "not found" }));
          return;
        }
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(note));
        return;
      }
      next();
    });
  }

  return {
    name: "notes-api",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

/** Collect every note/lab path from the catalog. */
function allNotePaths(catalog) {
  const paths = new Set();
  for (const track of catalog.tracks) {
    for (const mod of track.modules) {
      for (const topic of mod.topics) {
        for (const p of Object.values(topic.files)) paths.add(p);
        for (const lab of topic.labs || []) paths.add(lab.path);
      }
    }
  }
  return [...paths];
}

/** Emit catalog + note JSON into dist/ so GitHub Pages can serve them statically. */
function staticNotes() {
  return {
    name: "static-notes",
    apply: "build",
    generateBundle() {
      const catalog = buildCatalog();
      this.emitFile({
        type: "asset",
        fileName: "data/catalog.json",
        source: JSON.stringify(catalog),
      });
      this.emitFile({
        type: "asset",
        fileName: ".nojekyll",
        source: "",
      });
      for (const rel of allNotePaths(catalog)) {
        const note = readNote(rel);
        if (!note) continue;
        this.emitFile({
          type: "asset",
          fileName: `data/files/${rel}.json`,
          source: JSON.stringify(note),
        });
      }
    },
  };
}

const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react(), notesApi(), staticNotes()],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
