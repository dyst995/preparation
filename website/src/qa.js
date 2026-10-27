const QUESTION_HEADING =
  /^###\s+((?:REACT|NEST|NODE|DB)-\d+)\s+—\s+(.+)\s*$/;

const QUESTION_ID = /^(?:REACT|NEST|NODE|DB)-\d+$/i;

/** True when the hash segment is a handbook question id. */
export function isQuestionId(value) {
  return Boolean(value && QUESTION_ID.test(value));
}

/**
 * Split a handbook markdown file into an intro + ordered questions.
 * Each question keeps its full markdown body (heading through the next ### id).
 */
export function parseQaDocument(text) {
  if (!text) return { intro: "", questions: [] };

  const lines = text.split(/\r?\n/);
  const questions = [];
  let introLines = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(QUESTION_HEADING);
    if (match) {
      if (current) questions.push(finalize(current));
      current = {
        id: match[1].toUpperCase(),
        title: match[2].trim(),
        lines: [line],
      };
      continue;
    }
    if (current) current.lines.push(line);
    else introLines.push(line);
  }
  if (current) questions.push(finalize(current));

  return {
    intro: introLines.join("\n").trim(),
    questions,
  };
}

function finalize(partial) {
  const markdown = partial.lines.join("\n").trim();
  const meta = extractMeta(markdown);
  return {
    id: partial.id,
    title: partial.title,
    markdown,
    difficulty: meta.difficulty,
    category: meta.category,
  };
}

function extractMeta(markdown) {
  const difficulty = markdown.match(/\*\*Difficulty:\*\*\s*(.+)/)?.[1]?.trim();
  const category = markdown.match(/\*\*Category:\*\*\s*(.+)/)?.[1]?.trim();
  return { difficulty: difficulty || "", category: category || "" };
}

export function isQaHandbookTopic(track) {
  return track?.category === "handbook";
}
