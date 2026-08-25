---
name: explain-topic
description: >-
  Expand an existing curriculum/outline section into a complete technical study
  unit with theory, examples, connections, answer-free self-test questions in
  notes.md, and a matching answers.md answer key. Use when the user runs
  /explain-topic, asks to finish teaching a topic from existing notes, or wants
  outline → study unit → retrieval practice notes.
disable-model-invocation: true
---

# Explain Topic

You are maintaining my technical study notes.

I will give you an existing topic or section. Treat it as the starting curriculum, not as finished notes.

Your job is to turn it into a complete study unit that I can:

1. learn from now;
2. return to later for revision;
3. test myself on using retrieval practice.

## 1. Preserve and audit the existing material

Do not replace correct material merely to rewrite it.

First determine:

* what concepts are already covered;
* what concepts are mentioned but insufficiently explained;
* what important prerequisite or closely related concepts are missing;
* whether any statement is incorrect, misleading, outdated, or missing an important qualification.

Correct errors when necessary.

Do not expand into unrelated topics just because they are technically connected.

## 2. Expand the theory

Explain every concept required to understand the topic properly.

For each important concept, explain:

* **What it is**
* **Why it exists / why it matters**
* **How it works**
* **What happens internally when useful for understanding**
* **How it differs from easily confused concepts**
* **Practical consequences**
* **Common mistakes or misconceptions**
* **Important edge cases**
* **How it appears in real code**
* **How it may appear in an interview**

Do not merely state facts.

For example, don't stop at:

> JavaScript uses lexical scope.

Explain what lexical scope means, when scope relationships are established, how identifier lookup follows the scope chain, why the caller does not determine variable lookup, and how this leads into closures.

Prefer mental models and causal explanations over definitions that need to be memorized blindly.

## 3. Use examples to prove behavior

Add minimal code examples wherever behavior is easier to understand through code.

Examples should demonstrate a specific rule.

When useful, include prediction examples such as:

```js
// What happens here?
```

Then explain why the result occurs.

Include examples for important edge cases and common mistakes, not only the simplest happy path.

## 4. Maintain appropriate depth

The target is strong professional/interview-level understanding.

I should understand the mechanism well enough to:

* explain it in my own words;
* predict code behavior;
* debug problems involving it;
* compare it with related concepts;
* use it correctly in real programs;
* answer follow-up interview questions.

Do not turn the notes into language-specification trivia unless that detail materially improves understanding or is realistically useful.

Do not pad sections with generic advice or repetitive explanations.

## 5. Connect concepts

Explicitly show important relationships between concepts.

For example:

`lexical scope → scope chain → closures`

or:

`var function scope → loop variable sharing → closure bug`

Connections should explain **why** the concepts are related.

## 6. Add a self-test section

At the END of the study unit, add questions for later retrieval practice.

**Do not include answers to these questions.**

Separate them by type.

### A. Core recall

Test essential facts and definitions.

Example:

* What determines the scope of an identifier in JavaScript?

### B. Explain why

Require understanding rather than memorization.

Example:

* Why does calling a function from another scope not change which outer variables it can access?

### C. Compare and contrast

Test concepts that are easy to confuse.

Example:

* What is the difference between lexical scope and dynamic scope?

### D. Predict the output

Provide short code snippets and ask me to determine the result **and explain why**.

### E. Debugging

Give code containing realistic mistakes related to the topic and ask me to diagnose them.

### F. Application

Ask me to write or modify small pieces of code using the concepts.

### G. Interview questions

Ask realistic interview questions, including follow-up questions an interviewer might use after my initial answer.

### H. Connections

Test relationships with concepts from this section or earlier material.

For example:

* How does lexical scope make closures possible?

## 7. Question quality

Questions must test retrieval and reasoning.

Avoid excessive questions whose answers are directly encoded in their wording.

Do not create ten variations of the same question.

Prioritize concepts according to their importance.

Include a mixture of easy, medium, and difficult questions.

Some questions should combine several concepts.

For code questions, frequently require me to explain **why**, not merely state the output.

Generate as many questions as necessary to adequately test the important concepts, with no redundant questions. Do not target a fixed count. A small topic may need ~12; a large one (e.g. promises / event loop) may reasonably need 30+.

## 8. Keep questions separate from teaching material

The theory portion is my reference material.

The self-test portion in `notes.md` is what I will return to later without rereading the theory first.

Therefore:

* explanations belong in the theory sections of `notes.md`;
* questions belong at the end of `notes.md` under `# Self-test`;
* do **not** put answers immediately beneath self-test questions in `notes.md`.

When I later provide my answers in chat, evaluate each answer individually for:

* correctness;
* missing information;
* misconceptions;
* precision;
* whether I could explain it adequately in an interview.

Then explain what I got wrong or omitted and identify which concepts I should review.

## 9. Answer key file (`answers.md`)

After writing `notes.md`, also write **`answers.md`** in the **same topic folder**.

`answers.md` is the answer key for the Self-test section. I use it after attempting questions from memory.

### Requirements

1. Cover **every** self-test question from `notes.md` — same sections, same numbering/order.
2. For each question provide:
   * a clear **answer**;
   * a short **explanation** of why (mechanism, not only the result);
   * for predict/debug/application items: the expected output/diagnosis/solution **and** the reasoning;
   * for interview questions: a strong spoken-style answer **and** brief notes for the follow-ups.
3. Mirror the Self-test headings:

```markdown
# [Topic] — Answers

## Core recall
## Explain why
## Compare and contrast
## Predict the output
## Debugging
## Application
## Interview questions
## Connections
```

4. Do not leave placeholders like “see notes.” Answers must stand alone so I can check myself without hunting through `notes.md`.
5. Keep explanations concise but complete enough for interview-level understanding.
6. If `answers.md` already exists, update it in place when the self-test changes.

## Final structure

### `notes.md`

Use approximately:

# [Topic]

## What you need to know

## [Concept 1]

Theory and examples.

## [Concept 2]

Theory and examples.

...

## Common mistakes and misconceptions

## Connections to other concepts

## Interview perspective

# Self-test

## Core recall

## Explain why

## Compare and contrast

## Predict the output

## Debugging

## Application

## Interview questions

## Connections

### `answers.md`

Full answer key matching the Self-test section (see §9).

## 10. Save output in a topic folder

After you finish the study unit, **write it to disk** — do not only paste it in chat.

1. Derive a folder name from the topic:
   - lowercase kebab-case (e.g. `Scope` → `scope`, `Event Loop` → `event-loop`);
   - keep it short and stable; do not invent a curriculum path the user did not ask for.
2. Create that folder if it does not exist.
3. Write both files inside it:
   - `<topic-folder>/notes.md` — theory + self-test questions (no answers under questions)
   - `<topic-folder>/answers.md` — answers and explanations for every self-test question
4. Placement:
   - If the user points at an existing notes file or directory, create the topic folder **next to that source** (same parent directory), unless they specify another location.
   - Otherwise create the topic folder in the workspace root.
   - If the user names an explicit output path, use that.
5. If `notes.md` or `answers.md` already exists, update in place rather than creating duplicate filenames, unless the user asks for a new file.
6. After writing, tell the user the exact paths of **both** saved files.

The chat reply may briefly confirm what was expanded and where it was saved. The durable artifacts are `notes.md` and `answers.md` in the topic folder.
