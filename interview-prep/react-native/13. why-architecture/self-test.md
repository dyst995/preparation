# Why architecture matters in RN interviews — Self-test

## Core recall

1. What are interviewers *not* primarily scoring when they ask about project structure?
2. List the five capabilities from the curriculum (scale, ship, modernize, separate, onboard).
3. Name two CV stories this unit is supposed to make **explainable**.
4. What is “blast radius” in one sentence?
5. What is a big-bang rewrite vs an incremental/strangler approach (one contrast)?
6. Name the three layers: UI, domain, native — one example each of what belongs.
7. What does a **mid** vs **senior** structure answer sound like?
8. Where is the feature-based folder tree taught — this unit or next?

## Explain why

1. Why does a one-developer junk drawer fail when a second squad arrives?
2. Why is architecture a **regression-risk** tool, not decoration?
3. Why do interviewers distrust “we’ll rewrite it next quarter”?
4. Why must domain stay free of `Platform.OS`?
5. Why does onboarding speed count as architecture, not HR?
6. Why is “I used Redux” a mismatch if they asked how you structure the app?

## Compare and contrast

1. Folder trivia vs architecture as risk control
2. Greenfield (EasyPay) vs modernization (Wizer/MyCreditInfo) — same five tests, different move
3. Big-bang rewrite vs strangler/incremental
4. `components/` + `screens/` soup vs capability cohesion (high level)
5. UI vs domain vs native
6. `shared/` as real primitives vs a second `utils/`

## Predict the output

1. A payments bugfix also edits `App.tsx`, `helpers.js`, and an unrelated Profile screen. What did architecture fail to do? Explain.

2. Interviewer: “Where do files go?” You answer only with a tree dump, no risks. What signal did you miss?

3. Domain `calculateFee()` imports `Platform`. Which of the five tests fails loudest?

4. You freeze the app for four months for a rewrite, no store ships. Which curriculum bullet did you violate?

## Debugging

1. Review: PR titled “small wallet tweak” with 40 files across `hooks/`, `screens/`, `utils/`. What do you say in standup language?

2. New hire takes three days to find login. What’s the architecture smell?

3. They add `shared/paymentsHelpers.ts` used only by payments. Smell?

4. CV says “modernized RN app” but the story is “we renamed folders in one weekend.” What’s missing?

## Application

1. Recite the five interview tests in your own words.

2. Map EasyPay to **scale**; map MyCreditInfo to **incremental modernize** (one sentence each).

3. Draw a one-line dependency idea: screens → … → native (no giant tree).

4. Write two sentences you’d use if they only give you 20 seconds.

## Interview questions

1. Why does architecture matter in an RN interview?  
   **Follow-ups:** How does that show up on your CV? Folders vs this?

2. How do you modernize a legacy RN app without a rewrite freeze?

3. How do you keep a payments change from breaking auth?

4. Where should business rules live vs native SDKs?

5. How does architecture help code review?

## Connections

1. How does platform soup from fundamentals **prove** you need this unit?
2. How will feature-based folders (next section) **implement** blast-radius control?
3. How do crash-rate stories die if blast radius is huge?
4. How does `native/` per feature connect to Turbo Modules without dumping New Arch?
5. How is navigation-as-architecture a *later* section, not a substitute for this “why”?
