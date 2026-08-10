#!/usr/bin/env node
/**
 * Builds interview-book/ from interview-prep/ following order.md Absolute Order.
 * Each source .md becomes a topic folder; each "## N. Section" becomes a chapter file.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PREP = path.join(ROOT, 'interview-prep');
const BOOK = path.join(ROOT, 'interview-book');
const ORDER_FILE = path.join(PREP, 'order.md');

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[`'"*_]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function cleanHeading(s) {
  return s
    .replace(/\uFFFD/g, '')
    .replace(/[`*_]/g, '')
    .trim();
}

/** Extract absolute-order content paths from order.md */
function parseOrder(orderText) {
  const paths = [];
  const re = /`([a-z0-9-]+\/\d{2}-[a-z0-9-]+\.md)`/gi;
  let m;
  while ((m = re.exec(orderText))) {
    if (!paths.includes(m[1])) paths.push(m[1]);
  }
  return paths;
}

/**
 * Split markdown into:
 * - intro (before first numbered ## N.)
 * - numbered chapters (## 1. ... ## 8.)
 * - trailing sections (Senior, Interview bank, Mastery, etc.)
 */
function splitIntoChapters(content, sourceTitle) {
  const lines = content.split('\n');
  const chapters = [];

  // Find H1 title
  let h1 = sourceTitle;
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)/);
    if (m) {
      h1 = cleanHeading(m[1]);
      break;
    }
  }

  // Find all ## headings with their line indices
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+)/);
    if (m) {
      headings.push({ index: i, title: cleanHeading(m[1]), raw: m[1] });
    }
  }

  const numberedRe = /^(\d+)[.\):\-\u2013\u2014]\s*(.+)$/;
  const numbered = [];
  const other = [];

  for (const h of headings) {
    const nm = h.title.match(numberedRe);
    if (nm) {
      numbered.push({
        ...h,
        num: parseInt(nm[1], 10),
        shortTitle: cleanHeading(nm[2]),
      });
    } else {
      other.push(h);
    }
  }

  // Intro: from start until first numbered section (or first ## if no numbered)
  const firstContentIdx = numbered.length
    ? numbered[0].index
    : headings.length
      ? headings[0].index
      : lines.length;

  const introLines = lines.slice(0, firstContentIdx);
  // Drop the H1 from intro body if present; we'll rewrite chapter titles
  const introBody = introLines
    .filter((l, idx) => !(idx === 0 && l.startsWith('# ')))
    .join('\n')
    .trim();

  if (introBody.length > 40) {
    chapters.push({
      kind: 'intro',
      num: 0,
      title: 'Introduction & Learning Objectives',
      body: introBody,
    });
  }

  const trailingNames =
    /^(Senior-Level|Interview question|Full interview|Model answers|Hands-on|Mastery|Green flags|Tie to|Tie-backs|Behavioral|STAR|Rapid|Problem List|Daily drill)/i;

  function endOfNumberedSection(i) {
    const start = numbered[i].index;
    if (i + 1 < numbered.length) return numbered[i + 1].index;
    for (const h of other) {
      if (h.index > start && trailingNames.test(h.title)) return h.index;
    }
    return lines.length;
  }

  // Numbered chapters
  for (let i = 0; i < numbered.length; i++) {
    const start = numbered[i].index;
    const end = endOfNumberedSection(i);
    const body = lines.slice(start + 1, end).join('\n').trim();
    chapters.push({
      kind: 'chapter',
      num: numbered[i].num,
      title: numbered[i].shortTitle,
      body,
    });
  }

  // Trailing sections after last numbered chapter
  const lastNumEnd =
    numbered.length > 0
      ? endOfNumberedSection(numbered.length - 1)
      : firstContentIdx;

  const trailingHeadings = other.filter((h) => h.index >= lastNumEnd);
  // If no numbered chapters, treat all ## as chapters
  if (numbered.length === 0) {
    for (let i = 0; i < headings.length; i++) {
      const start = headings[i].index;
      const end = i + 1 < headings.length ? headings[i + 1].index : lines.length;
      const body = lines.slice(start + 1, end).join('\n').trim();
      chapters.push({
        kind: 'chapter',
        num: i + 1,
        title: headings[i].title,
        body,
      });
    }
  } else {
    for (let i = 0; i < trailingHeadings.length; i++) {
      const start = trailingHeadings[i].index;
      const end =
        i + 1 < trailingHeadings.length
          ? trailingHeadings[i + 1].index
          : lines.length;
      const body = lines.slice(start + 1, end).join('\n').trim();
      if (body.length < 20) continue;
      chapters.push({
        kind: 'extra',
        num: 100 + i,
        title: trailingHeadings[i].title,
        body,
      });
    }
  }

  return { h1, chapters };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function writeTopic(bookOrder, relPath) {
  const src = path.join(PREP, relPath);
  if (!fs.existsSync(src)) {
    console.warn('SKIP missing:', relPath);
    return null;
  }

  const content = fs.readFileSync(src, 'utf8');
  const track = path.dirname(relPath); // typescript-javascript
  const base = path.basename(relPath, '.md'); // 03-typescript-core
  const topicDir = path.join(BOOK, track, base);

  fs.mkdirSync(topicDir, { recursive: true });

  const { h1, chapters } = splitIntoChapters(content, base);
  const written = [];

  // intro as 00
  let fileNum = 0;
  for (const ch of chapters) {
    let n;
    let slug;
    if (ch.kind === 'intro') {
      n = 0;
      slug = 'introduction';
    } else if (ch.kind === 'chapter') {
      n = ch.num;
      slug = slugify(ch.title) || `chapter-${ch.num}`;
    } else {
      fileNum = Math.max(fileNum, chapters.filter((c) => c.kind === 'chapter').reduce((m, c) => Math.max(m, c.num), 0));
      n = ++fileNum + 100; // will renumber below
      slug = slugify(ch.title) || `extra-${n}`;
    }

    const filename =
      ch.kind === 'intro'
        ? `00-introduction.md`
        : ch.kind === 'chapter'
          ? `${pad(ch.num)}-${slug}.md`
          : null;

    if (filename) {
      const out = `# ${ch.kind === 'intro' ? h1 + ' — Introduction' : `${pad(ch.num)}. ${ch.title}`}\n\n> Source: \`interview-prep/${relPath}\`\n\n${ch.body}\n`;
      fs.writeFileSync(path.join(topicDir, filename), out);
      written.push({ file: filename, title: ch.title, kind: ch.kind, num: ch.num });
    }
  }

  // Write extras after max chapter number
  const maxNum = written
    .filter((w) => w.kind === 'chapter')
    .reduce((m, w) => Math.max(m, w.num), 0);
  let extraN = maxNum;
  for (const ch of chapters.filter((c) => c.kind === 'extra')) {
    extraN++;
    const slug = slugify(ch.title) || `extra-${extraN}`;
    const filename = `${pad(extraN)}-${slug}.md`;
    const out = `# ${pad(extraN)}. ${ch.title}\n\n> Source: \`interview-prep/${relPath}\`\n\n${ch.body}\n`;
    fs.writeFileSync(path.join(topicDir, filename), out);
    written.push({ file: filename, title: ch.title, kind: 'extra', num: extraN });
  }

  // Topic INDEX
  const indexLines = [
    `# ${h1}`,
    '',
    `> Book topic generated from \`interview-prep/${relPath}\``,
    '',
    `**Book order:** ${bookOrder}`,
    '',
    '## Chapters',
    '',
  ];
  for (const w of written.sort((a, b) => a.num - b.num || a.file.localeCompare(b.file))) {
    indexLines.push(`- [${w.file.replace('.md', '')}](./${w.file}) — ${w.title}`);
  }
  indexLines.push('');
  fs.writeFileSync(path.join(topicDir, 'INDEX.md'), indexLines.join('\n'));

  return {
    bookOrder,
    track,
    base,
    h1,
    relPath,
    topicDir: path.relative(BOOK, topicDir),
    chapters: written.sort((a, b) => a.num - b.num),
  };
}

// --- main ---
const orderText = fs.readFileSync(ORDER_FILE, 'utf8');
const paths = parseOrder(orderText);

// Clean book content dirs but keep scripts if any
if (fs.existsSync(BOOK)) {
  for (const entry of fs.readdirSync(BOOK)) {
    if (entry === 'scripts' || entry === '.git') continue;
    fs.rmSync(path.join(BOOK, entry), { recursive: true, force: true });
  }
}
fs.mkdirSync(BOOK, { recursive: true });

const topics = [];
paths.forEach((p, i) => {
  const result = writeTopic(i + 1, p);
  if (result) topics.push(result);
});

// Master README
const readme = `# Interview Book

A chapter-by-chapter book generated from \`interview-prep/\`, following [\`interview-prep/order.md\`](../interview-prep/order.md).

Each **topic folder** is named after a prep file (e.g. \`03-typescript-core\`). Inside it, every numbered section becomes its own **chapter** file.

**${topics.length} topics · ${topics.reduce((s, t) => s + t.chapters.length, 0)} chapters**

## How to read

1. Follow [order.md](./order.md) top to bottom (same Absolute Order as interview-prep).
2. Open a topic folder → start at \`00-introduction.md\` (if present), then \`01-\`, \`02-\`, …
3. Use each topic's \`INDEX.md\` as the chapter list.

## Topics (Absolute Order)

| # | Topic | Track | Chapters |
|---|-------|-------|----------|
${topics
  .map(
    (t) =>
      `| ${String(t.bookOrder).padStart(2, '0')} | [${t.h1}](./${t.topicDir}/INDEX.md) | ${t.track} | ${t.chapters.length} |`
  )
  .join('\n')}

## Tracks

${[...new Set(topics.map((t) => t.track))]
  .map((track) => {
    const list = topics.filter((t) => t.track === track);
    return `### ${track}\n\n${list.map((t) => `- [${t.base}](./${t.topicDir}/INDEX.md) (${t.chapters.length} chapters)`).join('\n')}`;
  })
  .join('\n\n')}

## Regenerating

\`\`\`bash
node interview-book/scripts/build-book.mjs
\`\`\`

Source of truth remains \`interview-prep/\`. Re-run the script after editing prep files.
`;

fs.writeFileSync(path.join(BOOK, 'README.md'), readme);

// Book order.md
const orderMd = `# Interview Book — Reading Order

Same Absolute Order as [\`interview-prep/order.md\`](../interview-prep/order.md).

Mark \`[x]\` as you finish each chapter.

---

${topics
  .map((t) => {
    const lines = [
      `## ${String(t.bookOrder).padStart(2, '0')}. ${t.h1}`,
      '',
      `Folder: [\`${t.topicDir}\`](./${t.topicDir}/INDEX.md)`,
      '',
    ];
    for (const ch of t.chapters) {
      lines.push(`- [ ] [${ch.file.replace('.md', '')}](./${t.topicDir}/${ch.file})`);
    }
    lines.push('');
    return lines.join('\n');
  })
  .join('\n')}
`;

fs.writeFileSync(path.join(BOOK, 'order.md'), orderMd);

// Manifest JSON for tooling
fs.writeFileSync(
  path.join(BOOK, 'manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), topics }, null, 2)
);

console.log(`Built ${topics.length} topics, ${topics.reduce((s, t) => s + t.chapters.length, 0)} chapters`);
console.log(`Output: ${BOOK}`);
