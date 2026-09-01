# Perceived Performance — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is perceived performance? Name four techniques from this section.
- [ ] How does a skeleton differ from a centered spinner? What is optimistic UI, and why must it include failure handling?
- [ ] What is progressive rendering in one sentence? What does CLS measure?
- [ ] Perceived vs raw/compute performance; instant click feedback vs `useTransition` pending.
- [ ] Why can the same fetch duration feel faster with a skeleton? Why isn’t faster raw computation always the right fix?

## Predict / debug

- [ ] Like button — skeleton or optimistic toggle? State the choice and explain why.
- [ ] First load of a dashboard with known card layout — spinner-only or skeleton? Why?
- [ ] Hero image without width/height — which CWV suffers? Why reserve image dimensions before load?
- [ ] Users say “page is slow” but the API is 100ms; blank white until all three queries finish. Perception fix? Explain why.
- [ ] Optimistic like count wrong after offline failure. What’s the missing piece?

## Say it out loud

- [ ] Explain perceived performance in 30–60 seconds as if an interviewer asked.
- [ ] Is a faster raw computation always the right performance fix? Follow-up: example where perception matters more. Follow-up: what metrics do you watch?
- [ ] Explain CLS to a product manager in plain language. How do you implement optimistic UI safely?
