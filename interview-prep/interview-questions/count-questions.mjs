import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = import.meta.dirname;
const tracks = ["react", "nestjs", "nodejs", "databases"];
const idRe = /^###\s+((?:REACT|NEST|NODE|DB)-\d+)\s+—\s+.+$/gm;

let total = 0;
for (const track of tracks) {
  const dir = join(root, track);
  let n = 0;
  const ids = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const text = readFileSync(join(dir, name), "utf8");
    const found = [...text.matchAll(idRe)].map((m) => m[1]);
    n += found.length;
    ids.push(...found);
  }
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  console.log(`${track}: ${n}${dupes.length ? " DUPES " + dupes.join(",") : ""}`);
  total += n;
}
console.log(`total: ${total}`);
