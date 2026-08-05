#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREP_ROOT = path.resolve(__dirname, '../../interview-prep');
const OUT_FILE = path.resolve(__dirname, '../src/data/flashcards.json');

const TRACK_LABELS = {
  'react-native': 'React Native',
  react: 'React',
  nextjs: 'Next.js',
  nestjs: 'NestJS',
  'typescript-javascript': 'TypeScript / JavaScript',
  'sql-databases': 'SQL / Databases',
  'devops-cloud': 'DevOps / Cloud',
};

const SKIP_FILES = new Set(['README.md', 'order.md', 'INDEX.md', 'REACT_NATIVE_INTERVIEW.md']);

function cleanText(s) {
  if (!s) return '';
  return s
    .replace(/\uFFFD/g, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMd(s) {
  return cleanText(
    s
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  );
}

function normalizeKey(s) {
  return stripMd(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function chapterTitleFromFile(filename) {
  const base = filename.replace(/\.md$/, '');
  const parts = base.split('-');
  if (/^\d+$/.test(parts[0])) {
    return parts.slice(1).join(' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function addCard(cards, seen, card) {
  const front = stripMd(card.front);
  const back = stripMd(card.back);
  if (!front || !back || front.length < 8 || back.length < 8) return;
  if (front.length > 600 || back.length > 4000) return;

  // Skip generic placeholder backs
  if (
    back.startsWith('Study this topic in') ||
    back.startsWith('Review:') && back.includes('Answer out loud')
  ) {
    return;
  }

  const key = normalizeKey(front);
  if (seen.has(key)) return;
  seen.add(key);

  cards.push({
    id: `${slugify(card.track + '-' + card.chapter)}-${cards.length}`,
    track: card.track,
    trackLabel: card.trackLabel,
    chapter: card.chapter,
    chapterLabel: card.chapterLabel,
    topic: card.topic || card.chapterLabel,
    front: front.endsWith('?') || card.type === 'rapid' ? front : front,
    back,
    type: card.type || 'qa',
  });
}

function readBlockquote(lines, start) {
  let i = start;
  while (i < lines.length && !lines[i].match(/^>\s/)) i++;
  if (i >= lines.length) return { text: '', end: start };

  const parts = [];
  while (i < lines.length && lines[i].match(/^>\s/)) {
    parts.push(stripMd(lines[i].replace(/^>\s*/, '').replace(/^["']|["']$/g, '')));
    i++;
  }
  return { text: parts.join(' '), end: i };
}

function scoreMatch(question, candidate) {
  const q = normalizeKey(question);
  const c = normalizeKey(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 80;

  const qWords = new Set(q.split(' ').filter((w) => w.length > 3));
  const cWords = c.split(' ').filter((w) => w.length > 3);
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
      while (i < lines.length && !lines[i].startsWith('## ')) {
        const h3 = lines[i].match(/^### (.+)/);
        if (h3) {
          const heading = stripMd(h3[1]);
          const { text, end } = readBlockquote(lines, i + 1);
          if (text.length > 15) {
            map.set(normalizeKey(heading), text);
            // Also store without question marks
            map.set(normalizeKey(heading.replace(/\?/g, '')), text);
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

  let best = { score: 0, text: '' };
  for (const [k, v] of modelMap.entries()) {
    const s = scoreMatch(question, k);
    if (s > best.score) best = { score: s, text: v };
  }
  return best.score >= minScore ? best.text : null;
}

function parseMarkdown(content, meta) {
  const cards = [];
  const seen = new Set();
  const lines = content.split('\n');
  const modelMap = parseModelAnswersMap(lines);

  let currentSection = meta.chapterLabel;
  let pendingBankQuestions = [];
  let i = 0;

  const flushBank = () => {
    for (const q of pendingBankQuestions) {
      const answer = findAnswerForQuestion(q, modelMap, 70);
      if (answer) {
        addCard(cards, seen, {
          ...meta,
          topic: currentSection,
          front: q,
          back: answer,
          type: 'qa',
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
      addCard(cards, seen, {
        ...meta,
        topic: currentSection,
        front: stripMd(arrowMatch[1]),
        back: stripMd(arrowMatch[2]),
        type: 'rapid',
      });
      i++;
      continue;
    }

    // **Q: question** or **Q1: question**
    const qLine = line.match(/^\*\*Q\d*:\s*(.+?)\*\*\s*$/);
    if (qLine) {
      const question = stripMd(qLine[1]);
      let answer = '';
      let j = i + 1;

      while (j < lines.length && j < i + 30) {
        const nl = lines[j];
        if (/^\*\*Q\d*:/.test(nl) || /^## /.test(nl)) break;

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

        // Plain paragraph answer (senior sections sometimes omit blockquote)
        if (
          nl.trim() &&
          !nl.startsWith('**Follow') &&
          !nl.startsWith('---') &&
          !nl.startsWith('###') &&
          !nl.startsWith('|') &&
          !nl.match(/^- /)
        ) {
          const plain = stripMd(nl);
          if (plain.length > 40 && !plain.startsWith('Q:')) {
            answer = plain;
            j++;
            break;
          }
        }
        j++;
      }

      if (!answer) {
        answer = findAnswerForQuestion(question, modelMap, 65);
      }

      if (answer) {
        addCard(cards, seen, {
          ...meta,
          topic: currentSection,
          front: question.endsWith('?') ? question : question,
          back: answer,
          type: 'qa',
        });
      }
      i = j;
      continue;
    }

    // ### Interview question block
    if (/^### Interview question/i.test(line)) {
      let j = i + 1;
      let question = '';
      let answer = '';
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
        addCard(cards, seen, {
          ...meta,
          topic: currentSection,
          front: question,
          back: answer,
          type: 'qa',
        });
      }
      i = j;
      continue;
    }

    // Interview question bank numbered list
    if (/^## Interview question/i.test(line) || /question bank/i.test(currentSection)) {
      const numQ = line.match(/^\d+\.\s+(.+)$/);
      if (numQ && !line.includes('->')) {
        const q = stripMd(numQ[1].replace(/^\*\*|\*\*$/g, ''));
        if (q.length > 12) {
          pendingBankQuestions.push(q);
        }
      }
    }

  // Model answer subsections under ## Model answers
    if (/^## Model answers/i.test(line)) {
      flushBank();
      i++;
      while (i < lines.length && !lines[i].startsWith('## ')) {
        const h3 = lines[i].match(/^### (.+)/);
        if (h3) {
          const heading = stripMd(h3[1]);
          const { text, end } = readBlockquote(lines, i + 1);
          if (text.length > 15) {
            addCard(cards, seen, {
              ...meta,
              topic: 'Model answers',
              front: heading.endsWith('?') ? heading : heading,
              back: text,
              type: 'qa',
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
  return cards;
}

function walkPrepDir(dir, track = '') {
  const allCards = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      allCards.push(...walkPrepDir(full, track || entry.name));
    } else if (entry.name.endsWith('.md') && !SKIP_FILES.has(entry.name)) {
      const relTrack = track || path.basename(path.dirname(full));
      if (!TRACK_LABELS[relTrack]) continue;
      const content = fs.readFileSync(full, 'utf8');
      allCards.push(
        ...parseMarkdown(content, {
          track: relTrack,
          trackLabel: TRACK_LABELS[relTrack],
          chapter: entry.name.replace(/\.md$/, ''),
          chapterLabel: chapterTitleFromFile(entry.name),
        })
      );
    }
  }
  return allCards;
}

const cards = walkPrepDir(PREP_ROOT);
const trackOrder = Object.keys(TRACK_LABELS);

cards.sort((a, b) => {
  const ta = trackOrder.indexOf(a.track);
  const tb = trackOrder.indexOf(b.track);
  if (ta !== tb) return ta - tb;
  return a.chapter.localeCompare(b.chapter);
});

const topics = {};
for (const c of cards) {
  const key = `${c.track}::${c.chapter}`;
  if (!topics[key]) {
    topics[key] = {
      id: key,
      track: c.track,
      trackLabel: c.trackLabel,
      chapter: c.chapter,
      chapterLabel: c.chapterLabel,
      count: 0,
    };
  }
  topics[key].count++;
}

const output = {
  generatedAt: new Date().toISOString(),
  totalCards: cards.length,
  tracks: trackOrder.map((t) => ({
    id: t,
    label: TRACK_LABELS[t],
    chapters: [...new Set(cards.filter((c) => c.track === t).map((c) => c.chapter))].map((ch) => {
      const sample = cards.find((c) => c.track === t && c.chapter === ch);
      return {
        id: ch,
        label: sample.chapterLabel,
        count: cards.filter((c) => c.track === t && c.chapter === ch).length,
      };
    }),
    count: cards.filter((c) => c.track === t).length,
  })),
  topics: Object.values(topics),
  cards,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
console.log(`Generated ${cards.length} flashcards with real Q&A across ${output.topics.length} topics`);
console.log(`Written to ${OUT_FILE}`);
