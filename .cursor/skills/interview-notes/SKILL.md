---
name: interview-notes
description: >-
  Create structured interview-preparation notes from technical material in the
  Definition / How to say it template. Use when the user asks for verbal
  rehearsal notes or that older concept template. For outline → full study unit
  with self-test questions in self-test.md, use /explain-topic instead.
---

# Interview Notes Generator

When I ask you to create notes, explain a topic, or convert existing material into notes, optimize the output for SOFTWARE ENGINEERING INTERVIEW PREPARATION.

## Primary goal

Turn technical material into notes that I can:

1. Understand
2. Memorize
3. Explain verbally in an interview
4. Use to answer follow-up questions

Do NOT merely summarize the source.

Expand unclear concepts enough that I can actually explain them.

---

# Required structure

For every major concept use:

## Concept Name

### Definition

Give a precise, interview-ready definition.

The definition should usually be 1–3 sentences.

Example:

> Lexical scope means that variable accessibility is determined by where code is physically written in the source code rather than where a function is called.

### Core idea

Explain the concept in simple language.

Focus on:
- how it works
- why it exists
- what JavaScript/TypeScript/React actually does

### Example

Provide a minimal practical code example.

```js
// smallest example that proves the concept
function outer() {
  const x = 1;
  function inner() {
    return x; // resolves via lexical scope, not call site
  }
  return inner;
}
```

Keep examples short. Prefer one clear point per snippet. Annotate the line that matters.

### How to say it (30–60 seconds)

Write a spoken answer I can rehearse out loud.

Use first person or natural spoken phrasing, not bullet-only jargon dumps.

### Common pitfalls

List mistakes interviewers listen for, and the correct framing.

### Follow-up questions

List 3–6 likely follow-ups with short model answers (2–4 sentences each).

### Green / red flags

- **Green**: what a strong answer includes
- **Red**: vague or wrong answers that sink the round

---

# Writing rules

- Prefer precision over length; cut fluff, keep mechanism.
- Name the actual runtime/language behavior (engine, React render phase, etc.) when it helps the verbal answer.
- When converting an existing chapter, preserve important tables, drills, and CV tie-backs; restructure them into the concept template above.
- If the source is shallow, expand it until an interview explanation is possible.
- If the source mixes many ideas, split into separate `## Concept` sections.
- Use the stack I am studying when relevant (JavaScript, TypeScript, React, React Native, Next.js, NestJS, SQL, DevOps).
- If this skill is used to produce retrieval questions, write them in a separate `self-test.md` in the same folder. Do **not** put a `# Self-test` section inside the notes file. Answers go in `answers.md`, never under the questions.

---

# Output checklist

Before finishing, confirm each concept has:

- [ ] Definition
- [ ] Core idea
- [ ] Example
- [ ] How to say it
- [ ] Common pitfalls
- [ ] Follow-up questions
- [ ] Green / red flags
