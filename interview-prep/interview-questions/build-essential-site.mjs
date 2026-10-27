/**
 * Build handbook markdown bundles for the website from essential/_*.json.
 * Output: essential-site/<track>/{01-must-know,02-important,03-advanced}.md
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const root = import.meta.dirname;
const outRoot = join(root, "essential-site");

const TRACKS = [
  {
    id: "react",
    json: "_react.json",
    sourceDir: "react",
    title: "Essential React",
    prefix: "REACT",
  },
  {
    id: "nestjs",
    json: "_nestjs.json",
    sourceDir: "nestjs",
    title: "Essential NestJS",
    prefix: "NEST",
  },
  {
    id: "nodejs",
    json: "_nodejs.json",
    sourceDir: "nodejs",
    title: "Essential Node.js",
    prefix: "NODE",
  },
  {
    id: "databases",
    json: "_databases.json",
    sourceDir: "databases",
    title: "Essential Databases",
    prefix: "DB",
  },
  {
    id: "typescript",
    json: "_typescript.json",
    sourceDir: "typescript",
    title: "Essential TypeScript",
    prefix: "TS",
  },
];

const TIERS = [
  { key: "must", file: "01-must-know.md", label: "Must Know" },
  { key: "important", file: "02-important.md", label: "Important" },
  { key: "advanced", file: "03-advanced.md", label: "Advanced" },
];

const HEADING =
  /^###\s+((?:REACT|NEST|NODE|DB|TS)-\d+)\s+—\s+(.+)\s*$/;

function parseQuestions(text) {
  const map = new Map();
  const lines = text.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const match = line.match(HEADING);
    if (match) {
      if (current) map.set(current.id, current.lines.join("\n").trim());
      current = { id: match[1].toUpperCase(), lines: [line] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) map.set(current.id, current.lines.join("\n").trim());
  return map;
}

function loadSourceMap(sourceDir) {
  const dir = join(root, sourceDir);
  const map = new Map();
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const part = parseQuestions(readFileSync(join(dir, name), "utf8"));
    for (const [id, body] of part) map.set(id, body);
  }
  return map;
}

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

let total = 0;
for (const track of TRACKS) {
  const selection = JSON.parse(
    readFileSync(join(root, "essential", track.json), "utf8"),
  );
  const bodies = loadSourceMap(track.sourceDir);
  const trackDir = join(outRoot, track.id);
  mkdirSync(trackDir, { recursive: true });

  for (const tier of TIERS) {
    const items = selection
      .filter((x) => x.tier === tier.key)
      .sort((a, b) => a.rank - b.rank);
    const missing = items.filter((x) => !bodies.has(x.id));
    if (missing.length) {
      throw new Error(
        `${track.id}/${tier.key} missing bodies: ${missing.map((m) => m.id).join(", ")}`,
      );
    }
    const parts = [
      `# ${track.title} — ${tier.label}`,
      "",
      `3-day essential set. ${items.length} questions in preparation order. Full handbook remains under \`${track.sourceDir}/\`.`,
      "",
    ];
    for (const item of items) {
      parts.push(bodies.get(item.id));
      parts.push("");
    }
    writeFileSync(join(trackDir, tier.file), parts.join("\n").trimEnd() + "\n");
    total += items.length;
  }
  writeFileSync(
    join(trackDir, "README.md"),
    `# ${track.title}\n\nCurated for a 3-day senior prep. Open Must Know first, then Important, then Advanced.\n`,
  );
}

console.log(`essential-site: wrote ${total} questions across ${TRACKS.length} tracks`);
