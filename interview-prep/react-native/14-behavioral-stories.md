# 14 - Behavioral / Project Stories (React Native Focus)

> Goal: Memorize tight, specific, metric-backed STAR stories for every major project on your CV, so behavioral rounds feel as strong as your technical rounds. Interviewers remember specifics and numbers, not adjectives.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Deliver a 60-90 second STAR answer for each flagship project without notes.
2. Answer the 10-15 most common behavioral questions by mapping them to your prepared stories instantly.
3. Always include a number, a decision, and an outcome in every story - never just a description of tasks.
4. Speak about ownership and client collaboration convincingly, not just technical execution.
5. Handle "tell me about a failure/hardest bug" without sounding rehearsed-but-empty or evasive.
6. Deliver stories with correct pacing, structure, and confidence (delivery mechanics, not just content).

---

## How to use this chapter

Each story below follows **STAR**: **S**ituation, **T**ask, **A**ction, **R**esult. For each one you get:
- A compact STAR breakdown (bullet form, for memorization/drilling).
- A ready-to-say 60-90 second spoken script (say it out loud, don't read it verbatim in the interview - internalize it).
- Likely follow-up questions.

Practice out loud, timed. If a story runs over 90 seconds, you're including too much technical narration and not enough decision/result - trim toward the outcome.

---

## 1. EasyPay - green-field build

### STAR breakdown

- **Situation**: A new payments product needed a React Native app built from zero - no existing codebase, no established patterns to inherit.
- **Task**: Own the architecture, tech stack choices, and delivery pipeline from the very first commit through to store release.
- **Action**: Chose a feature-based architecture, set up navigation/state/networking patterns intentionally (rather than growing organically), and built the release pipeline (Fastlane + GitLab Runner) alongside the app itself so releases were automated from early on rather than retrofitted later.
- **Result**: A production payments app shipped to both stores with a clean, scalable structure and an automated CI/CD pipeline already in place from day one - avoiding the technical debt you had to clean up on legacy projects.

### Spoken script (60-90s)

> "EasyPay was a green-field build - there was no existing code, so every architectural decision was mine to make and defend. Having already dealt with the pain of modernizing legacy apps like MyCreditInfo, I went in intentionally: feature-based folder structure instead of type-based, clear separation between UI, business logic, and data layers, and a networking layer with proper error handling and token refresh baked in from day one instead of bolted on later. I also set up the Fastlane and GitLab Runner release pipeline early, in parallel with feature development, rather than waiting until we were close to launch - so by the time we needed our first real release, the pipeline was already tested and boring, which is exactly what you want. The result was a payments app that shipped to both stores with a codebase that stayed maintainable as it grew, because the structure was chosen deliberately instead of accumulating organically."

### Likely follow-ups
- "What would you do differently if you rebuilt it today?" - have one honest answer ready (e.g. earlier investment in a design system, or adopting a stricter API-contract validation layer sooner).
- "How did you decide on your state management approach?" - tie to Chapter 3 (Zustand/React Query/Redux tradeoffs).
- "What was the hardest architectural decision?" - pick one real tradeoff (e.g. how to structure auth flow, or how to handle offline/error states for money movement) and explain the reasoning, not just the outcome.

---

## 2. MyCreditInfo - legacy modernization + crash reduction

### STAR breakdown

- **Situation**: An existing production app with a legacy codebase and a high crash rate (~20% on Play Store, i.e. roughly 1 in 5 users experiencing a crash).
- **Task**: Modernize the codebase incrementally while operating a live app, and bring the crash rate down without a rewrite-and-pray approach.
- **Action**: Established real crash visibility (proper Crashlytics symbolication), ranked crash clusters by user impact, fixed the highest-impact issues first, added defensive validation at API boundaries to prevent whole classes of null/undefined crashes recurring, and modernized architecture/dependencies incrementally alongside the ongoing fixes.
- **Result**: Crash rate dropped from ~20% to ~0.03% - essentially eliminating crashes as a user-facing problem - while the app kept shipping features throughout.

### Spoken script (60-90s)

> "MyCreditInfo was a legacy app with a crash rate around 20 percent - a huge portion of users were hitting crashes. Rather than proposing a rewrite, which would've stalled feature delivery, I focused on making the problem measurable first: making sure Crashlytics was properly wired with mapping file uploads so the stack traces were actually readable, since a lot of legacy crash data before that was closer to noise. Once I had real visibility, I ranked the crash clusters by how many users they actually affected, not by which looked easiest, and started fixing top offenders. A recurring pattern was legacy code making unsafe assumptions about API response shape, so instead of patching each occurrence individually, I added validation at the API boundary so entire categories of that crash stopped happening, not just the one instance I'd found. I repeated that loop release after release, alongside incrementally modernizing the surrounding architecture, and brought the crash rate down to about 0.03 percent - essentially production-stable - without ever pausing feature work to do a big-bang rewrite."

### Likely follow-ups
- "How did you convince stakeholders to prioritize crash fixes over new features?" - have a real answer about framing crash rate in terms of user trust/business impact, not just "engineering hygiene."
- "What was the single worst crash you found?" - have one specific, memorable example ready (pick a real one: e.g. a native module null crash, or a widescale JSON-parsing assumption).
- "How long did the full reduction take?" - be honest about the timeline; frame it as a sustained effort across multiple releases, not an overnight fix.

---

## 3. Wizer - architecture refactor + native iOS file preview + payments

### STAR breakdown

- **Situation**: Wizer needed both an architectural refactor (crash rate ~15%, plus maintainability issues) and new native capability - a native iOS file preview feature - alongside payment functionality.
- **Task**: Simultaneously improve stability/architecture and ship new native-touching features without regressing the payment flows users depended on.
- **Action**: Applied the same systematic crash-reduction approach as MyCreditInfo (measure, rank by impact, fix, prevent the class of bug, re-measure), refactored problematic architecture incrementally, and built a native iOS module for file preview where no adequate JS-only solution existed, all while keeping payment flows carefully regression-tested given their sensitivity.
- **Result**: Crash rate dropped from ~15% to ~0.09%, the app gained a smooth native file preview experience on iOS, and payment flows remained stable and trustworthy throughout the changes.

### Spoken script (60-90s)

> "Wizer had two problems at once: a crash rate around 15 percent and an architecture that was getting harder to extend safely, especially around payments, where regressions are the most costly kind of bug. I used the same disciplined approach I'd used on MyCreditInfo - proper crash visibility, ranking by impact, fixing the worst offenders first, and hardening the pattern that caused each cluster so it wouldn't recur - and got the crash rate down to about 0.09 percent. In parallel, the product needed a native file preview experience on iOS that didn't have a good JS-only equivalent, so I built a native iOS module for that specifically, which meant working directly with platform APIs rather than staying purely in JavaScript. Because payments were involved, I was deliberately conservative there - anything touching that flow got extra manual testing and staged rollout before going wide, since a payment bug is a very different severity of problem than a UI bug. The result was a materially more stable app, a genuinely native-feeling file preview feature, and payment flows that never regressed during the whole effort."

### Likely follow-ups
- "Why native instead of a JS library for file preview?" - have a specific technical reason ready (performance, platform-native UX expectations, or a capability gap in available JS libraries).
- "How did you make sure payments didn't regress while refactoring architecture around them?" - mention staged rollout, focused manual test passes, and possibly feature-flagging the refactor.
- "What's a specific bug you found in the old architecture?" - have one concrete, specific example.

---

## 4. Online School - deadline pressure + CI/CD + crash reduction

### STAR breakdown

- **Situation**: A nationwide education platform app with a hard deadline, a crash rate around ~28%, and no mature CI/CD in place.
- **Task**: Deliver on the deadline *and* materially improve stability, without treating them as mutually exclusive.
- **Action**: Introduced a proper Fastlane + GitLab Runner pipeline so releases became fast and repeatable instead of manual and error-prone, which itself freed up time to spend on the crash-reduction effort rather than fighting release friction; applied the same systematic crash triage playbook under time pressure, prioritizing ruthlessly by impact given the limited time.
- **Result**: Crash rate dropped from ~28% to ~0.15%, the CI/CD pipeline made every subsequent release faster and safer, and the deadline was met without shipping an unstable product to a nationwide user base.

### Spoken script (60-90s)

> "Online School was a nationwide platform under a hard deadline, and it had a crash rate around 28 percent - almost a third of users hitting crashes - with no real CI/CD, meaning every release was manual and slow. Given the deadline, my instinct wasn't to treat stability and speed as competing goals - I set up a Fastlane and GitLab Runner pipeline early, which sounds like it costs time upfront, but it actually paid for itself almost immediately by making every subsequent release faster and far less error-prone, freeing up real hours to spend on the crash work instead of manual release steps. On the stability side, I ran the same disciplined triage - proper Crashlytics visibility, ranking by impact, fixing the worst clusters, hardening the underlying pattern - but under real time pressure, so prioritization was even more ruthless than usual, since there wasn't time to chase low-impact issues. We hit the deadline with the app live nationwide, and the crash rate came down from 28 percent to about 0.15 percent, so we didn't have to trade quality for speed - the CI/CD investment actually made both possible."

### Likely follow-ups
- "How did you decide to spend time on CI/CD instead of just fixing crashes directly, given the deadline?" - strong opportunity to talk about compounding leverage vs short-term optics.
- "What would you have done if the deadline and stability truly conflicted?" - have an honest answer (e.g. what you'd have flagged/escalated, what tradeoff you'd have proposed).
- "How many releases happened during that period?" - if you recall specifics, use them; if not, describe cadence generally (e.g. frequent iterative releases rather than one big one).

---

## 5. Clean House - Zebra DataWedge barcode integration

### STAR breakdown

- **Situation**: Clean House needed barcode scanning workflows integrated with Zebra hardware devices using DataWedge, a capability with no off-the-shelf RN solution.
- **Task**: Bridge Zebra's native DataWedge broadcast-intent-based scanning API into the React Native app reliably.
- **Action**: Built the native integration (Android intents/broadcast receivers under the hood) to receive scan events from DataWedge and surface them cleanly to JS, handling edge cases like configuration profiles and device-specific quirks.
- **Result**: Reliable barcode scanning workflows on Zebra hardware, integrated cleanly into the app's business logic without exposing DataWedge's native complexity to the rest of the JS codebase.

### Spoken script (60-90s)

> "Clean House needed barcode scanning on Zebra handheld devices using DataWedge, which is Zebra's native scanning service - there wasn't a ready-made React Native library that handled it well, so this meant real native Android integration. DataWedge communicates via broadcast intents rather than a typical SDK call pattern, so I built the native bridge to register for those broadcasts, parse scan events, and expose a clean, simple JS API to the rest of the app - the business logic layer never needed to know DataWedge intents existed underneath. There were real device-specific quirks to handle, like DataWedge profile configuration and making sure the app correctly claimed focus for scan events versus other apps on the same device. The result was reliable, production-ready barcode workflows that felt like a native RN feature to the rest of the team, even though the underlying integration was genuinely native Android work."

### Likely follow-ups
- "Why DataWedge instead of the device camera for scanning?" - Zebra hardware scanners are dramatically faster/more reliable than camera-based scanning for high-volume warehouse/logistics-style use, especially at range and in poor lighting - know this reasoning.
- "What was the trickiest part of that integration?" - have a specific technical anecdote (e.g. broadcast receiver lifecycle issues, or profile configuration mismatches).

---

## 6. Fastlane + GitLab Runner CI/CD (cross-cutting story)

### STAR breakdown

- **Situation**: Multiple apps across your projects either had no CI/CD or had manual, error-prone release processes.
- **Task**: Build a reliable, repeatable Android + iOS release pipeline usable across projects.
- **Action**: Set up Fastlane lanes per platform (build, sign, upload, changelog, notify) and GitLab Runner infrastructure - including a self-hosted macOS runner for iOS builds - with staged rollouts and secrets handled securely.
- **Result**: Releases went from manual, risky, and slow to automated, auditable, and fast, directly enabling faster iteration and safer production releases across multiple apps.

### Spoken script (60-90s)

> "Across several projects I kept running into the same problem: releases were manual, which meant they were slow, inconsistent, and risky - easy to fat-finger a signing step or forget a version bump. I built out Fastlane lanes for both Android and iOS covering build, signing, store upload, and changelog/notification steps, and wired that into GitLab CI, including setting up a self-hosted macOS runner specifically for iOS since that needs Xcode. Signing secrets and API keys were handled through GitLab's protected, masked CI variables and, for iOS certificates specifically, through Fastlane match so the whole team and CI shared one signing identity instead of everyone minting their own certificates. Production releases were gated behind manual approval and used staged rollouts rather than shipping to everyone at once. The impact was direct: what used to be an error-prone manual process with real risk of a bad signing mistake became a one-click, auditable pipeline, which also meant we could react to production issues - hotfixes - far faster than before."

### Likely follow-ups
- See Chapter 11 in depth for any technical follow-up on this story (signing, pipeline stages, secrets).
- "What was the biggest pipeline failure you had to debug?" - have a specific incident ready (expired cert, versionCode collision, etc.).

---

## 7. Client collaboration - requirements to production

### STAR breakdown

- **Situation**: Across projects (especially Orient Logic's fintech/government-adjacent apps), requirements came directly from clients, not just internal product teams, often with domain-specific constraints (compliance, government process requirements).
- **Task**: Translate client requirements into technical scope, give realistic estimates, and deliver working software the client could trust.
- **Action**: Ran a disciplined process - clarifying ambiguous requirements early, pushing back on unrealistic scope/timeline combinations with data (not just gut feeling), communicating tradeoffs in business terms rather than pure technical jargon, and keeping clients updated with working builds rather than only status reports.
- **Result**: Delivered production apps that met client and (for government-adjacent work) compliance-sensitive requirements, with a collaborative relationship that supported ongoing work rather than one-off delivery.

### Spoken script (60-90s)

> "Working at Orient Logic, requirements often came directly from clients in fintech and government-adjacent contexts, which meant there was less room for ambiguity than typical internal product work - compliance and process requirements were often non-negotiable. My approach was to clarify ambiguous requirements upfront rather than build against assumptions, and when a client asked for a scope and timeline that didn't realistically fit together, I'd push back with specifics - here's what's achievable by this date, here's what would need to move - rather than either silently over-promising or being difficult about it. I also tried to keep communication in business terms: instead of saying 'the API contract changed,' I'd explain what that meant for what the client would actually see and by when. And I preferred showing working builds over just status updates, since that surfaces misunderstandings early instead of at the end. That approach built enough trust that engagements tended to continue into follow-on work rather than ending after one delivery."

### Likely follow-ups
- "Tell me about a time a client's requirement changed late in a project." - have a specific example of how you handled scope change gracefully.
- "How do you handle a client who doesn't understand technical constraints?" - emphasize translating to business impact/tradeoffs.

---

## 8. Hardest production bug you diagnosed

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

## Hands-on drills (do these)

- [ ] Say each of the 7 main stories out loud, timed, aiming for 60-90 seconds each.
- [ ] Record yourself (audio) telling the MyCreditInfo story and listen back - check for filler words, pacing, and whether you land the number clearly.
- [ ] Fill in the "hardest production bug" template with a real, specific bug from your history.
- [ ] Fill in the failure-story skeleton with a real, specific mistake.
- [ ] Practice switching between stories rapid-fire: have someone (or yourself) ask 5 random questions from the "common questions" table and answer using the mapped story within 10 seconds of thinking time.
- [ ] Practice a follow-up chain: tell the Wizer story, then answer 2 follow-up questions on it without breaking stride.
- [ ] Practice the client collaboration story with a specific, named example of pushback you gave that turned out to be right.

---

## Green flags / red flags

### Green flags interviewers love
- Every story lands on a specific, memorable number or outcome.
- Clear personal ownership ("I decided," "I pushed back," "I chose") alongside genuine team credit.
- Follow-up questions are answered with more specific detail, not repetition of the same points.
- The failure story is a real, slightly uncomfortable admission with a genuine lesson.
- Stories connect technical decisions to business/user impact, not just "I wrote code."

### Red flags
- Vague stories with no numbers ("we made it a lot more stable").
- Only ever says "we," never explains personal contribution.
- Failure story is actually a humblebrag ("I care too much about quality").
- Same story reused for every question regardless of fit.
- Can't answer a natural follow-up because the story wasn't actually lived/detailed enough.

---

## Mastery checklist

- [ ] I can tell all 7 core stories fluently, in 60-90 seconds each, without notes.
- [ ] I know my exact crash-reduction numbers for all three apps and can state them precisely under pressure.
- [ ] I have a real, specific "hardest bug" story filled in (not the template placeholders).
- [ ] I have a real, specific "biggest mistake" story filled in (not the template placeholders).
- [ ] I can map any of the common behavioral questions to the right story within a few seconds.
- [ ] I consistently use "I" for my own decisions and "we" for team outcomes, correctly.
- [ ] I can handle at least 2 natural follow-up questions on each story without breaking stride.
- [ ] I've practiced at least one full mock behavioral round (self-recorded or with another person).
