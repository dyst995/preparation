#!/usr/bin/env node
/**
 * Generates question-bank.json from interview-prep/ and interview-dsa/.
 * Reuses the flashcards Q&A extraction patterns, then classifies items
 * and adds coding prompts from live-coding sections + DSA Must problems.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREP_ROOT = path.resolve(__dirname, "../../interview-prep");
const DSA_ROOT = path.resolve(__dirname, "../../interview-dsa");
const OUT_FILE = path.resolve(__dirname, "../src/data/question-bank.json");

const TRACK_LABELS = {
  "react-native": "React Native",
  react: "React",
  nextjs: "Next.js",
  nestjs: "NestJS",
  "typescript-javascript": "TypeScript / JavaScript",
  "sql-databases": "SQL / Databases",
  "devops-cloud": "DevOps / Cloud",
  dsa: "DSA / Algorithms",
};

const SKIP_FILES = new Set([
  "README.md",
  "order.md",
  "INDEX.md",
  "REACT_NATIVE_INTERVIEW.md",
  "PROBLEMS-MASTER-LIST.md",
]);

function cleanText(s) {
  if (!s) return "";
  return s
    .replace(/\uFFFD/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMd(s) {
  return cleanText(
    s
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  );
}

function normalizeKey(s) {
  return stripMd(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chapterTitleFromFile(filename) {
  const base = filename.replace(/\.md$/, "");
  const parts = base.split("-");
  if (/^\d+$/.test(parts[0])) {
    return parts.slice(1).join(" ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function classifyType(question, section, chapter) {
  const q = (question + " " + section + " " + chapter).toLowerCase();
  if (
    /live.?coding|whiteboard|implement |write a |build a |coding prompt|exercise/.test(
      q
    ) ||
    /\bimplement\b|\bwrite\b.*\bfunction\b|\bhook\b.*from scratch/.test(q)
  ) {
    return "coding";
  }
  if (
    /behavioral|star |tell me about|cv.?tie|story drill|deployment story/.test(q)
  ) {
    return "behavioral";
  }
  return "conceptual";
}

function inferDifficulty(question, section) {
  const q = (question + " " + section).toLowerCase();
  if (/senior|staff|harder|hard\b|follow.?up/.test(q)) return "senior";
  if (/rapid.?fire|easy|fundament/.test(q)) return "mid";
  return "mid";
}

function addItem(items, seen, item) {
  const question = stripMd(item.question);
  const modelAnswer = stripMd(item.modelAnswer || "");
  if (!question || question.length < 8) return;
  if (question.length > 800) return;
  if (
    modelAnswer.startsWith("Study this topic in") ||
    (modelAnswer.startsWith("Review:") && modelAnswer.includes("Answer out loud"))
  ) {
    return;
  }

  const key = normalizeKey(question);
  if (seen.has(key)) return;
  seen.add(key);

  const type = item.type || classifyType(question, item.topic || "", item.chapter);
  items.push({
    id: `${slugify(item.track + "-" + item.chapter)}-${items.length}`,
    track: item.track,
    trackLabel: item.trackLabel,
    chapter: item.chapter,
    chapterLabel: item.chapterLabel,
    file: item.file,
    topic: item.topic || item.chapterLabel,
    question,
    modelAnswer: modelAnswer.slice(0, 2500),
    type,
    difficulty: item.difficulty || inferDifficulty(question, item.topic || ""),
    starterCode: item.starterCode || null,
  });
}

function readBlockquote(lines, start) {
  let i = start;
  while (i < lines.length && !lines[i].match(/^>\s/)) i++;
  if (i >= lines.length) return { text: "", end: start };

  const parts = [];
  while (i < lines.length && lines[i].match(/^>\s/)) {
    parts.push(
      stripMd(lines[i].replace(/^>\s*/, "").replace(/^["']|["']$/g, ""))
    );
    i++;
  }
  return { text: parts.join(" "), end: i };
}

function scoreMatch(question, candidate) {
  const q = normalizeKey(question);
  const c = normalizeKey(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 80;

  const qWords = new Set(q.split(" ").filter((w) => w.length > 3));
  const cWords = c.split(" ").filter((w) => w.length > 3);
  let hits = 0;
  for (const w of cWords) if (qWords.has(w)) hits++;
  return (hits / Math.max(qWords.size, 1)) * 60;
}

function parseModelAnswersMap(lines) {
  const map = new Map();
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^## Model answers/i.test(line)) {
      i++;
      while (i < lines.length && !lines[i].startsWith("## ")) {
        const h3 = lines[i].match(/^### (.+)/);
        if (h3) {
          const heading = stripMd(h3[1]);
          const { text, end } = readBlockquote(lines, i + 1);
          if (text.length > 15) {
            map.set(normalizeKey(heading), text);
            map.set(normalizeKey(heading.replace(/\?/g, "")), text);
          }
          i = end;
        } else {
          i++;
        }
      }
      continue;
    }
    i++;
  }
  return map;
}

function findAnswerForQuestion(question, modelMap, minScore = 70) {
  const key = normalizeKey(question);
  if (modelMap.has(key)) return modelMap.get(key);

  let best = { score: 0, text: "" };
  for (const [k, v] of modelMap.entries()) {
    const s = scoreMatch(question, k);
    if (s > best.score) best = { score: s, text: v };
  }
  return best.score >= minScore ? best.text : null;
}

function parseMarkdown(content, meta) {
  const items = [];
  const seen = new Set();
  const lines = content.split("\n");
  const modelMap = parseModelAnswersMap(lines);

  let currentSection = meta.chapterLabel;
  let pendingBankQuestions = [];
  let i = 0;

  const flushBank = () => {
    for (const q of pendingBankQuestions) {
      const answer = findAnswerForQuestion(q, modelMap, 70);
      if (answer) {
        addItem(items, seen, {
          ...meta,
          topic: currentSection,
          question: q,
          modelAnswer: answer,
        });
      }
    }
    pendingBankQuestions = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    const h2 = line.match(/^## (.+)/);
    if (h2) {
      flushBank();
      currentSection = stripMd(h2[1]);
      i++;
      continue;
    }

    // Numbered rapid fire: 1. **Question** -> answer
    const arrowMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*->\s*(.+)$/);
    if (arrowMatch) {
      addItem(items, seen, {
        ...meta,
        topic: currentSection,
        question: stripMd(arrowMatch[1]),
        modelAnswer: stripMd(arrowMatch[2]),
        type: "conceptual",
        difficulty: "mid",
      });
      i++;
      continue;
    }

    // Live-coding numbered exercises: 1. **Implement ...**
    if (
      /live.?coding|whiteboard|coding.?style exercise/i.test(currentSection) ||
      /hands.?on|drill/i.test(currentSection)
    ) {
      const codingEx = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(.*)$/);
      if (codingEx && /implement|write|build|reproduce|fix|create/i.test(codingEx[1])) {
        const q = stripMd(codingEx[1] + " " + (codingEx[2] || ""));
        addItem(items, seen, {
          ...meta,
          topic: currentSection,
          question: q,
          modelAnswer:
            "Candidate should implement a correct solution, narrate approach, discuss complexity and edge cases.",
          type: "coding",
          difficulty: "mid",
          starterCode: `// ${q.slice(0, 80)}\n\n`,
        });
        i++;
        continue;
      }
    }

    // **G1. Implement...** style coding prompts with blockquote answers
    const labeledCoding = line.match(
      /^\*\*([A-Z]?\d+)\.\s*((?:Implement|Write|Build|Fix|Given|Create).+?)\*\*\s*$/i
    );
    if (labeledCoding) {
      const question = stripMd(labeledCoding[2]);
      let answer = "";
      let j = i + 1;
      while (j < lines.length && j < i + 40) {
        if (/^\*\*[A-Z]?\d+\./.test(lines[j]) || /^## /.test(lines[j])) break;
        if (lines[j].match(/^>\s/)) {
          const bq = readBlockquote(lines, j);
          answer = bq.text;
          j = bq.end;
          break;
        }
        j++;
      }
      addItem(items, seen, {
        ...meta,
        topic: currentSection,
        question,
        modelAnswer:
          answer ||
          "Implement a correct solution; explain tradeoffs and complexity.",
        type: /implement|write|build|fix|create/i.test(question)
          ? "coding"
          : classifyType(question, currentSection, meta.chapter),
        starterCode: /implement|write|build|fix|create/i.test(question)
          ? `// ${question.slice(0, 100)}\n\n`
          : null,
      });
      i = Math.max(j, i + 1);
      continue;
    }

    // **Q: question** or **Q1: question** or **A1. question**
    const qLine = line.match(/^\*\*(?:Q\d*:|([A-Z]\d+)\.)\s*(.+?)\*\*\s*$/);
    if (qLine) {
      const question = stripMd(qLine[2] || qLine[0]);
      // Fix: better extract
      const qMatch = line.match(/^\*\*(?:Q\d*:\s*|([A-Z]\d+)\.\s*)(.+?)\*\*\s*$/);
      const qText = qMatch ? stripMd(qMatch[2]) : stripMd(line);
      let answer = "";
      let j = i + 1;

      while (j < lines.length && j < i + 30) {
        const nl = lines[j];
        if (/^\*\*(?:Q\d*:|[A-Z]\d+\.)/.test(nl) || /^## /.test(nl)) break;

        const labeled = nl.match(
          /^\*\*(?:Strong answer|Model answer|Answer(?: sketch)?):\*\*\s*(.*)$/i
        );
        if (labeled) {
          answer = stripMd(labeled[1]);
          if (!answer && lines[j + 1]?.match(/^>\s/)) {
            const bq = readBlockquote(lines, j + 1);
            answer = bq.text;
            j = bq.end;
          } else {
            j++;
          }
          break;
        }

        if (nl.match(/^>\s/)) {
          const bq = readBlockquote(lines, j);
          answer = bq.text;
          j = bq.end;
          break;
        }

        if (
          nl.trim() &&
          !nl.startsWith("**Follow") &&
          !nl.startsWith("---") &&
          !nl.startsWith("###") &&
          !nl.startsWith("|") &&
          !nl.match(/^- /)
        ) {
          const plain = stripMd(nl);
          if (plain.length > 40 && !plain.startsWith("Q:")) {
            answer = plain;
            j++;
            break;
          }
        }
        j++;
      }

      if (!answer) {
        answer = findAnswerForQuestion(qText, modelMap, 65);
      }

      if (answer) {
        addItem(items, seen, {
          ...meta,
          topic: currentSection,
          question: qText,
          modelAnswer: answer,
        });
      }
      i = j;
      continue;
    }

    // ### Interview question block
    if (/^### Interview question/i.test(line)) {
      let j = i + 1;
      let question = "";
      let answer = "";
      while (j < lines.length && j < i + 25) {
        const qm = lines[j].match(/^\*\*Q:\s*(.+?)\*\*/);
        if (qm) question = stripMd(qm[1]);
        if (lines[j].match(/^>\s/)) {
          const bq = readBlockquote(lines, j);
          answer = bq.text;
          j = bq.end;
          break;
        }
        j++;
      }
      if (question && answer) {
        addItem(items, seen, {
          ...meta,
          topic: currentSection,
          question,
          modelAnswer: answer,
        });
      }
      i = j;
      continue;
    }

    if (
      /^## Interview question/i.test(line) ||
      /question bank/i.test(currentSection)
    ) {
      const numQ = line.match(/^\d+\.\s+(.+)$/);
      if (numQ && !line.includes("->")) {
        const q = stripMd(numQ[1].replace(/^\*\*|\*\*$/g, ""));
        if (q.length > 12) {
          pendingBankQuestions.push(q);
        }
      }
    }

    if (/^## Model answers/i.test(line)) {
      flushBank();
      i++;
      while (i < lines.length && !lines[i].startsWith("## ")) {
        const h3 = lines[i].match(/^### (.+)/);
        if (h3) {
          const heading = stripMd(h3[1]);
          const { text, end } = readBlockquote(lines, i + 1);
          if (text.length > 15) {
            addItem(items, seen, {
              ...meta,
              topic: "Model answers",
              question: heading,
              modelAnswer: text,
            });
          }
          i = end;
        } else {
          i++;
        }
      }
      continue;
    }

    i++;
  }

  flushBank();
  return items;
}

function walkPrepDir(dir, track = "") {
  const all = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      all.push(...walkPrepDir(full, track || entry.name));
    } else if (entry.name.endsWith(".md") && !SKIP_FILES.has(entry.name)) {
      const relTrack = track || path.basename(path.dirname(full));
      if (!TRACK_LABELS[relTrack] || relTrack === "dsa") continue;
      const content = fs.readFileSync(full, "utf8");
      const relFile = path.relative(path.resolve(__dirname, "../.."), full);
      all.push(
        ...parseMarkdown(content, {
          track: relTrack,
          trackLabel: TRACK_LABELS[relTrack],
          chapter: entry.name.replace(/\.md$/, ""),
          chapterLabel: chapterTitleFromFile(entry.name),
          file: relFile,
        })
      );
    }
  }
  return all;
}

/** Parse Must problems from PROBLEMS-MASTER-LIST.md into coding items */
function parseDsaProblems() {
  const listPath = path.join(DSA_ROOT, "PROBLEMS-MASTER-LIST.md");
  if (!fs.existsSync(listPath)) return [];

  const content = fs.readFileSync(listPath, "utf8");
  const lines = content.split("\n");
  const items = [];
  const seen = new Set();
  let chapter = "dsa";
  let chapterLabel = "DSA";
  let chapterFile = "interview-dsa/PROBLEMS-MASTER-LIST.md";
  let inMust = false;

  for (const line of lines) {
    if (/^## Must problems/i.test(line)) {
      inMust = true;
      continue;
    }
    if (/^## Should|^## Optional/i.test(line)) {
      inMust = false;
      continue;
    }

    const chap = line.match(/^### \d+ - (.+?)\s*\(\[(.+?)\]\((.+?)\)\)/);
    if (chap) {
      chapterLabel = stripMd(chap[1]);
      const link = chap[3].replace(/^\.\//, "");
      chapter = link.replace(/\.md$/, "");
      chapterFile = `interview-dsa/${link}`;
      continue;
    }

    if (!inMust) continue;

    const prob = line.match(
      /^- \[[ x]\]\s+(.+?)\s*\(LC\s*(\d+)\)\s*-\s*(Easy|Medium|Hard)/i
    );
    if (prob) {
      const name = stripMd(prob[1]);
      const lc = prob[2];
      const diff = prob[3].toLowerCase();
      const question = `Implement ${name} (LeetCode ${lc}). Explain your approach, write working TypeScript/JavaScript, cover edge cases, and state time/space complexity.`;
      addItem(items, seen, {
        track: "dsa",
        trackLabel: TRACK_LABELS.dsa,
        chapter,
        chapterLabel,
        file: chapterFile,
        topic: chapterLabel,
        question,
        modelAnswer: `Correct ${diff} solution for ${name} (LC ${lc}) with clear complexity analysis and edge-case handling.`,
        type: "coding",
        difficulty: diff === "hard" ? "senior" : diff === "medium" ? "mid" : "mid",
        starterCode: `/**\n * ${name} (LC ${lc})\n * TODO: implement\n */\n\nfunction solve(/* args */) {\n  // your solution\n}\n\n`,
      });
    }
  }
  return items;
}

const prepItems = walkPrepDir(PREP_ROOT);
const dsaItems = parseDsaProblems();
const items = [...prepItems, ...dsaItems];

const trackOrder = Object.keys(TRACK_LABELS);
items.sort((a, b) => {
  const ta = trackOrder.indexOf(a.track);
  const tb = trackOrder.indexOf(b.track);
  if (ta !== tb) return ta - tb;
  return a.chapter.localeCompare(b.chapter);
});

const tracks = trackOrder
  .map((t) => {
    const trackItems = items.filter((c) => c.track === t);
    if (!trackItems.length) return null;
    return {
      id: t,
      label: TRACK_LABELS[t],
      count: trackItems.length,
      conceptual: trackItems.filter((i) => i.type === "conceptual").length,
      coding: trackItems.filter((i) => i.type === "coding").length,
      behavioral: trackItems.filter((i) => i.type === "behavioral").length,
      chapters: [
        ...new Set(trackItems.map((c) => c.chapter)),
      ].map((ch) => {
        const sample = trackItems.find((c) => c.chapter === ch);
        return {
          id: ch,
          label: sample.chapterLabel,
          file: sample.file,
          count: trackItems.filter((c) => c.chapter === ch).length,
        };
      }),
    };
  })
  .filter(Boolean);

const output = {
  generatedAt: new Date().toISOString(),
  totalQuestions: items.length,
  byType: {
    conceptual: items.filter((i) => i.type === "conceptual").length,
    coding: items.filter((i) => i.type === "coding").length,
    behavioral: items.filter((i) => i.type === "behavioral").length,
  },
  tracks,
  questions: items,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
console.log(
  `Generated ${items.length} questions (${output.byType.conceptual} conceptual, ${output.byType.coding} coding, ${output.byType.behavioral} behavioral)`
);
console.log(`Written to ${OUT_FILE}`);
