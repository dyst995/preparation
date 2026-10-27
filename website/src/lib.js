import { isQuestionId } from "./qa.js";

export const TAB_META = [
  { id: "notes", label: "Notes" },
  { id: "techniques", label: "Techniques" },
  { id: "problems", label: "Problems" },
  { id: "selftest", label: "Self-test" },
  { id: "answers", label: "Answers" },
  { id: "repetition", label: "Repetition" },
  { id: "flashcards", label: "Flashcards" },
];

export const TAB_IDS = new Set(TAB_META.map((t) => t.id));

/** Top-level site areas shown in the header. */
export const CATEGORIES = [
  {
    id: "interview",
    label: "Interview",
    blurb: "Theory + flashcards",
    homeTitle: "Interview prep",
    homeBody:
      "Notes from this repo — study units (notes.md) and chapter files — plus flashcards when a topic has a flashcards.json deck. Checkboxes on notes and repetition are saved in this browser.",
    homeTrackId: null,
  },
  {
    id: "handbook",
    label: "Q&A",
    blurb: "Senior question bank",
    homeTitle: "Interview Q&A handbook",
    homeBody:
      "Long-form senior interview questions and answers for React, NestJS, Node.js, and databases. Open a section for the question index, then one question per page.",
    homeTrackId: "qa-overview",
  },
  {
    id: "english",
    label: "English",
    blurb: "Spoken interview English",
    homeTitle: "English",
    homeBody:
      "Phrases and unit lessons for speaking in interviews. Same notes / self-test / answers / repetition tabs as the other tracks.",
    homeTrackId: "english",
  },
];

export const STORE_KEY = "interview-notes-progress";
export const THEME_KEY = "interview-notes-theme";
export const CATEGORY_KEY = "interview-notes-category";

export function categoryForTrack(trackId, catalog) {
  if (!trackId) return "interview";
  const fromCatalog = catalog?.tracks?.find((t) => t.id === trackId)?.category;
  if (fromCatalog) return fromCatalog;
  if (trackId === "english") return "english";
  if (String(trackId).startsWith("qa-")) return "handbook";
  return "interview";
}

export function tracksForCategory(catalog, categoryId) {
  if (!catalog?.tracks) return [];
  return catalog.tracks.filter(
    (t) => (t.category || "interview") === categoryId,
  );
}

export function allTopics(catalog) {
  const out = [];
  for (const track of catalog.tracks) {
    for (const mod of track.modules) {
      for (const topic of mod.topics) {
        out.push({ track, mod, topic });
      }
    }
  }
  return out;
}

export function findTopic(catalog, trackId, dir) {
  return allTopics(catalog).find(
    (x) => x.track.id === trackId && x.topic.dir === dir,
  );
}

export function defaultTab(topic) {
  if (topic.files.notes) return "notes";
  if (topic.files.techniques) return "techniques";
  if (topic.files.problems) return "problems";
  if (topic.files.selftest) return "selftest";
  if (topic.files.flashcards) return "flashcards";
  return Object.keys(topic.files)[0] || "notes";
}

export function availableTabs(topic) {
  return TAB_META.filter((t) => Boolean(topic.files[t.id]));
}

export function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const parts = raw.split("/").filter(Boolean);
  if (!parts.length) return {};
  if (parts.length === 1) return { trackId: parts[0] };

  const last = parts.at(-1);
  if (isQuestionId(last)) {
    const maybeTab = parts.at(-2);
    const hasTab = TAB_IDS.has(maybeTab);
    return {
      trackId: parts[0],
      topicDir: parts.slice(1, hasTab ? -2 : -1).join("/"),
      tab: hasTab ? maybeTab : "notes",
      questionId: last.toUpperCase(),
    };
  }
  if (TAB_IDS.has(last)) {
    return {
      trackId: parts[0],
      topicDir: parts.slice(1, -1).join("/"),
      tab: last,
    };
  }
  return {
    trackId: parts[0],
    topicDir: parts.slice(1).join("/"),
  };
}

export function setHash(trackId, topicDir, tab, questionId) {
  if (!trackId) {
    location.hash = "";
    return;
  }
  if (!topicDir) {
    location.hash = `#/${encodeURIComponent(trackId)}`;
    return;
  }
  const dir = topicDir
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  let hash = `#/${encodeURIComponent(trackId)}/${dir}`;
  if (tab) hash += `/${encodeURIComponent(tab)}`;
  if (questionId) hash += `/${encodeURIComponent(questionId)}`;
  location.hash = hash;
}

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProgress(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

export function splitAnswers(md) {
  const re = /^##\s+Answers\s*$/m;
  const idx = md.search(re);
  if (idx === -1) return { body: md, answers: "" };
  return { body: md.slice(0, idx), answers: md.slice(idx) };
}
