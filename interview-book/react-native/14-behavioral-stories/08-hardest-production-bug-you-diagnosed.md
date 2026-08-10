# 08. Hardest production bug you diagnosed

> Source: `interview-prep/react-native/14-behavioral-stories.md`

### STAR breakdown (use a real specific bug - pick one from your actual experience and adapt this template)

- **Situation**: A production crash/bug affecting real users that wasn't straightforward to reproduce (e.g. device-specific, intermittent, or only in release builds).
- **Task**: Diagnose root cause under pressure with limited direct reproduction ability.
- **Action**: Used Crashlytics segmentation (device/OS breakdown) to find the pattern, ruled out red herrings systematically, potentially added targeted non-PII breadcrumbs to gather more context, and identified root cause (e.g. a native module edge case, an OEM-specific quirk, or a release-only Proguard/keep-rule issue).
- **Result**: Root cause identified and fixed, with a broader guard/process added to prevent that class of bug recurring.

### Spoken script (60-90s, template - fill in your specific real bug)

> "One of the hardest bugs I dealt with only reproduced in release builds on a subset of devices, which meant I couldn't just attach a debugger and step through it. I started with Crashlytics's device and OS segmentation to look for a pattern rather than guessing, which pointed to [specific pattern - e.g. a manufacturer, an OS version, or a release-only build config]. From there I [describe the specific investigative step - e.g. checked Proguard keep rules, checked a native module's handling of an edge-case input, checked an OEM-specific background execution quirk]. Once I found the root cause, the fix itself was [describe the fix], but just as important, I added [a guard/validation/logging] so a similar issue in that area would either not happen again or would be immediately diagnosable next time instead of requiring the same investigation from scratch."

> **Action item:** Before your interview, replace the bracketed parts with a real bug you personally diagnosed - interviewers can tell a genuine story from a generic template instantly, and a specific, slightly messy real story is far more convincing than a smooth generic one.

### Likely follow-ups
- "What would you have done if you couldn't find the pattern in Crashlytics?" - have an answer (e.g. request more detail from support/QA, add temporary broader logging, ship an instrumented beta to affected-looking users).
- "How long did it take to resolve?" - be honest; a hard bug taking real time is fine and expected.

---

## Common behavioral questions -> which story to use

| Question | Best story to reach for |
|---|---|
| "Tell me about a time you improved stability/quality with measurable results." | MyCreditInfo, Wizer, or Online School (pick based on emphasis: legacy, native+payments, or deadline pressure) |
| "Tell me about a production incident you owned end-to-end." | Hardest production bug, or any crash-reduction story framed around one specific incident |
| "Tell me about delivering under a tight deadline without sacrificing quality." | Online School |
| "Describe a disagreement about a technical decision and how you resolved it." | Wizer (native vs JS for file preview) or client collaboration story (pushing back on scope/timeline) |
| "Tell me about building something from scratch." | EasyPay |
| "Tell me about a time you worked directly with a client/non-technical stakeholder." | Client collaboration story |
| "Tell me about integrating with a difficult third-party system/hardware." | Clean House / DataWedge |
| "Tell me about improving a process, not just a product." | Fastlane + GitLab Runner CI/CD story |
| "Tell me about a time you had to learn something unfamiliar quickly." | Clean House DataWedge, or Wizer native iOS file preview |
| "Tell me about a mistake you made." | Have a genuine, specific one ready - see Section on failure stories below |
| "Why do you want to leave/why are you looking?" | Not a project story - prepare separately, keep it forward-looking and positive |

---

## On "tell me about a failure" / weakness questions

Do not default to a fake-humble non-answer ("I work too hard" style). Interviewers can tell, and it actively hurts trust in your other answers.

### A good failure story structure

1. A real, specific technical or judgment mistake (e.g. underestimating a migration's complexity, shipping something without adequate testing, a wrong technical bet).
2. What the actual consequence was (be honest, not catastrophic-sounding or trivial-sounding).
3. What you did once you realized it (owned it, fixed it, communicated it).
4. What you changed afterward so it wouldn't repeat (a concrete process/technical change, not just "I learned to be more careful").

### Model answer skeleton

> "Early on [context], I [specific decision/mistake]. The result was [honest, specific consequence - not a strength disguised as a weakness]. Once I realized it, I [what you did to address it directly and quickly]. Afterward, I changed [a concrete practice] so that class of mistake wouldn't happen again - and it hasn't."

**Action item:** Fill this in with a real mistake from your own history (e.g. an early release without adequate staged rollout that caused a spike, or an initial architecture choice you had to walk back). A true, specific, slightly uncomfortable answer here is a green flag, not a red one.

---

## Delivery tips (how you say it matters as much as what you say)

### Structure
- Lead with the **situation in one sentence** - don't over-set-up. Interviewers want to get to the action/result quickly.
- Spend the most time on **your specific actions and decisions**, not a general description of the project.
- **Always end with a concrete result** - a number, a state change ("crash rate dropped to X"), or a clear outcome. Never trail off after describing actions.

### Numbers
- Always state your headline numbers precisely: **~20% -> 0.03%** (MyCreditInfo), **~15% -> 0.09%** (Wizer), **~28% -> 0.15%** (Online School). Precision signals the story is real, not exaggerated on the spot.
- If asked for a number you don't have precisely, say so honestly ("I don't recall the exact figure, but directionally it was a significant drop, roughly...") rather than inventing false precision.

### Ownership language
- Use "I" for decisions you personally made, "we" for team outcomes - mixing them up either overclaims or undersells your role, and interviewers notice both.
- Name the tradeoff you considered and rejected, not just what you did - this signals seniority ("I considered X, but chose Y because Z" beats "I did Y").

### Pacing
- Practice each story with a timer. Target 60-90 seconds for a first pass; be ready to go deeper if asked a follow-up, but don't front-load all the detail unprompted.
- If you notice yourself narrating technical steps for more than 20-30 seconds without mentioning a decision or outcome, cut to the result.

### Common delivery mistakes to avoid

| Mistake | Fix |
|---|---|
| Story has no clear result/number | Always land on a concrete outcome |
| Rambling technical narration with no decision points | Structure around 2-3 explicit decisions you made |
| Overusing "we" for things you personally drove | Use "I" for your specific contributions |
| Reciting the same story for every question | Map multiple stories to different question types (see table above) |
| Sounding rehearsed word-for-word | Practice the structure/beats, not a memorized script - vary the phrasing naturally |
| Failure story that isn't really a failure | Pick something genuinely imperfect with a real lesson |

---
