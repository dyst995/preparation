# How to use this handbook

This is a reference and a drill bank. Reading it cover to cover will not make the answers retrievable in an interview.

## One sitting (45–70 minutes)

1. Pick **one section** you have not touched in the longest time (or the weakest row in `PROGRESS.md`).
2. Open the topic file. Cover the answer. Read only **Question** and **Context and Constraints**.
3. Answer out loud in this order: what is happening, why, what you would measure before changing anything, the trade-off.
4. Uncover **Senior Engineer's Answer**. Mark the gap in one sentence (wrong mechanism, missing constraint, or jumped to a tool).
5. Do the **Senior-Level Follow-up** without looking, then read it.
6. Stop at 4–6 questions. More than that in one pass becomes recognition, not recall.

## Weekly loop

| Day | Work |
|---|---|
| 1–2 | New section, questions only, notes closed |
| 3 | Same IDs again from memory (active recall) |
| 4 | Code: re-implement one **Practical Implementation** snippet without looking |
| 5 | Weak IDs only, plus one trade-off question said in under 90 seconds |

## What “done” means for a question

You can say it without the file, name one case where the technique is the wrong tool, and you did not invent a metric. Checking the box in `PROGRESS.md` is optional bookkeeping; the spoken retry is the real check.

## What not to do

- Do not memorize the follow-up as a script. Interviewers change the constraint (strict serializable vs read committed, React 17 vs 18 batching, singleton vs request-scoped provider).
- Do not add `memo`, Redis, queues, or microservices because the question mentioned slowness. The answers are written to resist that.
- Pair this handbook with the shorter theory units under `interview-prep/react`, `nestjs`, `typescript-javascript`, and `sql-databases` when a mechanism is still fuzzy. This folder is the question bank, not the first explanation.
