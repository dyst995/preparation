# Legacy modernization playbook — Self-test

## Core recall

1. Recite steps **0–4** by name.
2. Step 0: four (groups of) things you characterize.
3. Step 1: three seam moves (`features/`, legacy piles, lint).
4. Step 2: three strangler rules (slice, shippable, tests).
5. Step 3: three platform stabilizers.
6. Step 4: three metrics.
7. Map **MyCreditInfo, Wizer, Online School, EasyPay** to one curriculum phrase each.
8. What is a **vertical slice** in this playbook (vs “all hooks”)?
9. What does **no new code in legacy piles** prevent?
10. What is a **characterization test** for?

## Explain why

1. Why characterize **before** introducing `features/`?
2. Why is big-bang a weak **first** answer for a live store app?
3. Why must the app stay **shippable every week**?
4. Why “no new code in `src/screens/`” matters as much as creating `features/`?
5. Why lint/module boundaries beat a README seam?
6. Why Crashlytics hygiene is in the playbook, not “later ops”?
7. Why delete **unused native** deps during modernization?
8. Why conversion metrics sit next to crash-free users?
9. Why EasyPay is **not** a strangler story?
10. Why Online School’s **deadline** argues **for** strangler, not against it?

## Compare and contrast

1. Strangler vs big-bang rewrite.
2. Step 1 seams vs Step 2 moving a slice (what each is for).
3. MyCreditInfo vs EasyPay (patient vs prevention).
4. Wizer vs MyCreditInfo (architecture vs architecture **+ native ownership**).
5. Characterization tests vs “we’ll add tests after the rewrite.”
6. Renaming `screens/` → `features/components` vs strangling **Stories**.
7. This playbook vs [type-vs-feature](../14.%20type-vs-feature/notes.md) (how vs target shape).
8. Step 3 vs [app shell](../16.%20app-shell/notes.md) boot order (overlap, not duplicates).

## Predict the output

1. Team freezes the app 4 months for a “clean RN rewrite.” Which steps did they skip, and what usually happens at merge?

2. They create `features/` but PRs still add files to `src/screens/`. What happens to soup?

3. They “modernize” by renaming folders in one weekend. Crash rate unchanged. Which steps were missing?

4. They extract `utils/` into `shared/` first, not a user-facing slice. Step 0 said launch crashes are 80% **one god screen**. What’s wrong?

5. EasyPay interview: they describe strangling `screens/`. What’s the category error?

6. Crash-free improves; **pay** conversion drops. Which Step 4 failure is this?

## Debugging

1. Stakeholder: “Rewrite it, the architecture is too messy.” You have a 20% crash rate and a store train this week. What do you say (playbook order)?

2. Two squads still fight in `components/` six months into “feature-based.” Which Step 1 rule failed?

3. Native module unused for a year still in `package.json`; New Architecture blocked. Which step?

4. No dSYMs; “we can’t tell if architecture helped.” Step 3/4 diagnosis.

5. Characterization tests missing; extracted fees now **wrong** in one country. What would tests have done?

6. CV says “modernized” but the story is only “I built a new Button.” What’s missing vs this unit?

## Application

1. Recite 0–4 in 30 seconds with one bullet each.

2. 90s MyCreditInfo: hit characterize → seams → strangle → stabilize → numbers (~20% → 0.03%).

3. One sentence each: Wizer, Online School, EasyPay.

4. Write the review rule: “PRs must not …” (legacy piles).

5. Pick the **first** vertical slice given: 70% crashes in Login, payments is 3% of crashes but 80% of revenue. What do you strangle first and why? (There is a real tradeoff — argue it.)

6. Sketch “week N / week N+2” for a Feed → `features/stories` strangler.

## Interview questions

1. Walk me through modernizing a legacy RN app.  
   **Follow-ups:** Why not rewrite? How do you show it worked?

2. How did you modernize MyCreditInfo / Wizer / Online School? (Pick one; don’t ramble all four.)

3. What’s a case where you would **not** start a structural migration yet?

4. How do you keep two mental models (legacy + features) without chaos?

5. EasyPay vs the legacy apps — what’s different about the architecture story?

## Connections

1. How does this playbook **implement** the five tests from [why architecture](../13.%20why-architecture/notes.md)?
2. How is a vertical slice the **same** as [feature layering](../15.%20feature-layering/notes.md) + [DTO mapping](../19.%20data-domain/notes.md) for **one** capability?
3. How can [auth/app stacks](../17.%20nav-architecture/notes.md) be an **early** strangler without rewriting wallet?
4. How do [flavors/CI](../20.%20flavors-config/notes.md) / [11-cicd](../11-cicd-releases.md) show up in Step 3?
5. What will §10’s EasyPay tree be **for**, if this unit is the **migration** story?
