import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const REPO = join(import.meta.dirname, "..");

/** Track roots in this repo (interview-prep folders + DSA). */
const TRACKS = [
  {
    id: "typescript-javascript",
    root: "interview-prep/typescript-javascript",
    name: "TypeScript / JavaScript",
  },
  { id: "react", root: "interview-prep/react", name: "React" },
  {
    id: "react-native",
    root: "interview-prep/react-native",
    name: "React Native",
  },
  { id: "nextjs", root: "interview-prep/nextjs", name: "Next.js" },
  { id: "nestjs", root: "interview-prep/nestjs", name: "NestJS" },
  {
    id: "sql-databases",
    root: "interview-prep/sql-databases",
    name: "SQL / Databases",
  },
  {
    id: "native-developement",
    root: "interview-prep/native-developement",
    name: "Native development",
  },
  {
    id: "devops-cloud",
    root: "interview-prep/devops-cloud",
    name: "DevOps / Cloud",
  },
  { id: "interview-dsa", root: "interview-dsa", name: "DSA" },
];

/** Files that make a study-unit folder (this repo’s structure). */
const DOC_FILES = {
  "notes.md": "notes",
  "self-test.md": "selftest",
  "answers.md": "answers",
  "repetition.md": "repetition",
  "common-techniques.md": "techniques",
  "problems.md": "problems",
  "flashcards.json": "flashcards",
};

const SKIP_DIRS = new Set([
  ".git",
  "website",
  "node_modules",
  ".cursor",
  ".vscode",
]);

const SKIP_ROOT_MD = new Set([
  "README.md",
  "INDEX.md",
  "order.md",
  "REACT_NATIVE_INTERVIEW.md",
  "PROBLEMS-MASTER-LIST.md",
]);

function prettyDir(name) {
  const s = name.replace(/^\d+[\.\-]\s*/, "").replace(/[-_]/g, " ");
  return s
    .split(" ")
    .map((w) =>
      w === w.toLowerCase() ? w.replace(/^./, (c) => c.toUpperCase()) : w,
    )
    .join(" ");
}

function firstHeading(file) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/).slice(0, 40)) {
      if (line.startsWith("# ")) return line.slice(2).trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

function listDir(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function repoRel(abs) {
  return relative(REPO, abs).split(sep).join("/");
}

function collectFolderFiles(absDir) {
  const files = {};
  for (const [filename, kind] of Object.entries(DOC_FILES)) {
    const fp = join(absDir, filename);
    try {
      if (statSync(fp).isFile()) files[kind] = repoRel(fp);
    } catch {
      /* missing */
    }
  }
  return files;
}

function isStudyUnitDir(dir) {
  const files = collectFolderFiles(dir);
  return Boolean(
    files.notes ||
      files.selftest ||
      files.techniques ||
      files.problems ||
      files.flashcards,
  );
}

function walkStudyUnits(dir, acc) {
  for (const name of listDir(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    let st;
    try {
      st = statSync(path);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkStudyUnits(path, acc);
  }
  if (isStudyUnitDir(dir)) acc.push(dir);
}

function sortTopics(topics) {
  return topics.sort((a, b) => {
    const na = a.id.match(/^(\d+)/);
    const nb = b.id.match(/^(\d+)/);
    if (na && nb) {
      const d = Number(na[1]) - Number(nb[1]);
      if (d) return d;
    }
    if (na && !nb) return -1;
    if (!na && nb) return 1;
    return a.name.localeCompare(b.name);
  });
}

function pushModule(modules, moduleId, moduleName, topic) {
  if (!modules.has(moduleId)) {
    modules.set(moduleId, { id: moduleId, name: moduleName, topics: [] });
  }
  modules.get(moduleId).topics.push(topic);
}

function chapterFlashcards(absMd) {
  const json = absMd.replace(/\.md$/i, ".flashcards.json");
  try {
    if (statSync(json).isFile()) return repoRel(json);
  } catch {
    /* none yet */
  }
  return null;
}

export function buildCatalog() {
  const tracks = [];

  for (const spec of TRACKS) {
    const root = join(REPO, spec.root);
    const modules = new Map();

    const indexPath = join(root, "INDEX.md");
    const rnIndex = join(root, "REACT_NATIVE_INTERVIEW.md");
    const overviewFile = (() => {
      try {
        if (statSync(indexPath).isFile()) return indexPath;
      } catch {
        /* none */
      }
      try {
        if (statSync(rnIndex).isFile()) return rnIndex;
      } catch {
        /* none */
      }
      return null;
    })();

    if (overviewFile) {
      pushModule(modules, "overview", "Overview", {
        id: "_index",
        name: "Index",
        title: firstHeading(overviewFile) || spec.name,
        dir: "_index",
        files: { notes: repoRel(overviewFile) },
      });
    }

    const unitDirs = [];
    walkStudyUnits(root, unitDirs);
    for (const abs of unitDirs.sort()) {
      if (abs === root) continue;
      const files = collectFolderFiles(abs);
      if (!Object.keys(files).length) continue;
      const rel = relative(root, abs).split(sep).join("/");
      const id = rel.split("/").pop();
      pushModule(modules, "units", "Study units", {
        id,
        name: prettyDir(id),
        title:
          firstHeading(join(abs, "notes.md")) ||
          firstHeading(join(abs, "common-techniques.md")) ||
          prettyDir(id),
        dir: rel,
        files,
      });
    }

    for (const name of listDir(root).sort()) {
      if (!name.endsWith(".md") || SKIP_ROOT_MD.has(name)) continue;
      const abs = join(root, name);
      try {
        if (!statSync(abs).isFile()) continue;
      } catch {
        continue;
      }
      const stem = name.replace(/\.md$/i, "");
      const files = { notes: repoRel(abs) };
      const fc = chapterFlashcards(abs);
      if (fc) files.flashcards = fc;
      pushModule(modules, "chapters", "Chapters", {
        id: stem,
        name: prettyDir(stem),
        title: firstHeading(abs) || prettyDir(stem),
        dir: stem,
        files,
      });
    }

    for (const mod of modules.values()) {
      sortTopics(mod.topics);
    }

    const ordered = ["overview", "units", "chapters"]
      .filter((id) => modules.has(id))
      .map((id) => modules.get(id));

    if (!ordered.length || ordered.every((m) => !m.topics.length)) continue;

    tracks.push({
      id: spec.id,
      name: spec.name,
      modules: ordered,
    });
  }

  return { tracks };
}

export function readNote(rel) {
  if (!rel || rel.includes("..")) return null;
  if (!rel.endsWith(".md") && !rel.endsWith(".json")) return null;
  const root = resolve(REPO);
  const resolved = resolve(root, rel);
  if (!resolved.startsWith(root + sep) && resolved !== root) return null;
  try {
    const text = readFileSync(resolved, "utf8");
    if (rel.endsWith(".json")) {
      return { path: rel, kind: "json", data: JSON.parse(text) };
    }
    return { path: rel, kind: "md", text };
  } catch {
    return null;
  }
}
