# Learning Order

Follow this sequence top to bottom. It is built for **8-10 hours/day** and prioritizes what interviewers will hit hardest for your CV: **TypeScript/JS -> React -> React Native (including Bridge / Native Modules / Turbo Modules) -> native Android/iOS host literacy -> NestJS + SQL -> Next.js -> DevOps -> mocks**.

Mark items `[x]` as you finish.

**How to study each file**
1. Read core sections
2. Answer interview questions out loud (no notes)
3. Read **Senior-Level Best Practices** last
4. Do drills
5. Rehearse 1 CV story (15-20 min) every day

**Daily template (9 hours)**
| Block | Time | What |
|---|---|---|
| 1 | 2.0h | Main chapter(s) from today's list |
| 2 | 2.0h | Continue / second chapter |
| 3 | 1.5h | Senior section + harder follow-ups out loud |
| 4 | 1.5h | Drills / whiteboard / mini coding |
| 5 | 1.0h | DSA warm-up (arrays/hash/trees) OR system-design sketch |
| 6 | 1.0h | STAR story rehearsal + weak-spot notes |

If a day lists more than you can finish deeply, **do not skip ahead** - finish quality over speed.

---

## Phase 0 - Orientation (30-45 min)

- [ ] [README.md](./README.md)
- [ ] Skim this file fully once
- [ ] [react-native/REACT_NATIVE_INTERVIEW.md](./react-native/REACT_NATIVE_INTERVIEW.md) (know RN map)
- [ ] Write your top 5 target roles on paper (RN / fullstack / frontend)

---

## Day 1 - JavaScript + TypeScript foundation

Goal: survive any language filter round.

- [ ] [typescript-javascript/INDEX.md](./typescript-javascript/INDEX.md)
- [ ] [typescript-javascript/01-javascript-fundamentals.md](./typescript-javascript/01-javascript-fundamentals.md)
- [ ] [typescript-javascript/02-async-event-loop.md](./typescript-javascript/02-async-event-loop.md)
- [ ] [typescript-javascript/03-typescript-core.md](./typescript-javascript/03-typescript-core.md)

**End-of-day check**
- [ ] Explain closures + event loop in 3 minutes
- [ ] Explain `unknown` vs `any`, generics, narrowing

---

## Day 2 - TypeScript advanced + React core

Goal: typed production JS + React rendering/hooks fluency.

- [ ] [typescript-javascript/04-typescript-advanced.md](./typescript-javascript/04-typescript-advanced.md)
- [ ] [typescript-javascript/05-interview-questions-drills.md](./typescript-javascript/05-interview-questions-drills.md)
- [ ] [react/INDEX.md](./react/INDEX.md)
- [ ] [react/01-rendering-reconciliation.md](./react/01-rendering-reconciliation.md)
- [ ] [react/02-hooks-deep-dive.md](./react/02-hooks-deep-dive.md)

**End-of-day check**
- [ ] Predict 5 event-loop outputs correctly
- [ ] Explain render vs commit + rules of hooks

---

## Day 3 - React state/perf/UI + start React Native

Goal: finish web React bar, enter your strongest track.

- [ ] [react/03-state-data-fetching.md](./react/03-state-data-fetching.md)
- [ ] [react/04-performance-patterns.md](./react/04-performance-patterns.md)
- [ ] [react/05-forms-ui-css.md](./react/05-forms-ui-css.md)
- [ ] [react/06-interview-questions.md](./react/06-interview-questions.md)
- [ ] [react-native/01-fundamentals.md](./react-native/01-fundamentals.md)

**End-of-day check**
- [ ] Defend Zustand vs Redux vs React Query
- [ ] Explain RN host views vs DOM

---

## Day 4 - React Native core app skills

Goal: architecture, state, navigation, networking like production.

- [ ] [react-native/02-architecture.md](./react-native/02-architecture.md)
- [ ] [react-native/03-state-management.md](./react-native/03-state-management.md)
- [ ] [react-native/04-navigation.md](./react-native/04-navigation.md)
- [ ] [react-native/05-networking.md](./react-native/05-networking.md)

**End-of-day check**
- [ ] Whiteboard EasyPay feature-based architecture
- [ ] Explain JWT refresh single-flight + deep link auth gating

---

## Day 5 - CV differentiator: Bridge / Native Modules / Turbo Modules

Goal: own the keywords on your CV. Do these in this exact order.

- [ ] [react-native/15-bridge.md](./react-native/15-bridge.md)
- [ ] [react-native/16-native-modules.md](./react-native/16-native-modules.md)
- [ ] [react-native/17-turbo-modules.md](./react-native/17-turbo-modules.md)
- [ ] [react-native/07-native-modules.md](./react-native/07-native-modules.md) (applied integrations)
- [ ] [react-native/06-performance.md](./react-native/06-performance.md)

**End-of-day check**
- [ ] Draw Bridge vs JSI/Turbo Modules from memory
- [ ] 90-second stories: DataWedge, Wizer iOS preview, MyCreditInfo native patch
- [ ] FlatList + JS vs UI thread diagnosis

---

## After Day 5 (same evening or Day 6 morning) — Native platform literacy

Goal: Gradle / Xcode / lifecycle / permissions so modules and signing have a **host**. Day 5 is already full — budget **~2.5h** (01–04 first; 05–06 if they probe storage or crashes).

- [ ] [native-developement/INDEX.md](./native-developement/INDEX.md)
- [ ] [native-developement/01-android.md](./native-developement/01-android.md)
- [ ] [native-developement/02-ios.md](./native-developement/02-ios.md)
- [ ] [native-developement/03-android-vs-ios.md](./native-developement/03-android-vs-ios.md) (fill tables from memory)
- [ ] [native-developement/05-storage-background-security.md](./native-developement/05-storage-background-security.md)
- [ ] [native-developement/06-debug-playbook.md](./native-developement/06-debug-playbook.md)
- [ ] [native-developement/04-interview-questions.md](./native-developement/04-interview-questions.md) (notes closed)

**Check**
- [ ] Three SDK numbers + iOS signing trio
- [ ] When you open Android Studio / Xcode vs Metro
- [ ] Permission crash (iOS) vs silent fail (Android)
- [ ] Vault vs AsyncStorage; no background payment socket
- [ ] One incident: ANR **or** patched AAR **or** QuickLook

---

## Day 6 - React Native production / fintech / releases

Goal: look senior on shipping and stability.

- [ ] [react-native/08-push-firebase-device.md](./react-native/08-push-firebase-device.md)
- [ ] [react-native/09-forms-ux-fintech.md](./react-native/09-forms-ux-fintech.md)
- [ ] [react-native/10-testing.md](./react-native/10-testing.md)
- [ ] [react-native/11-cicd-releases.md](./react-native/11-cicd-releases.md)
- [ ] [react-native/12-upgrades-stability.md](./react-native/12-upgrades-stability.md)

**End-of-day check**
- [ ] Crash-rate stories with exact numbers (MyCreditInfo / Wizer / Online School)
- [ ] Fastlane + GitLab Runner pipeline explanation
- [ ] Payment idempotency + double-submit answer

---

## Day 7 - RN security + NestJS start + SQL start

Goal: close RN track; open backend foundation.

- [ ] [react-native/13-security.md](./react-native/13-security.md)
- [ ] [react-native/14-behavioral-stories.md](./react-native/14-behavioral-stories.md)
- [ ] [nestjs/INDEX.md](./nestjs/INDEX.md)
- [ ] [nestjs/01-nestjs-architecture.md](./nestjs/01-nestjs-architecture.md)
- [ ] [sql-databases/INDEX.md](./sql-databases/INDEX.md)
- [ ] [sql-databases/01-sql-fundamentals.md](./sql-databases/01-sql-fundamentals.md)

**End-of-day check**
- [ ] 5 STAR stories out loud
- [ ] Nest DI/modules explanation
- [ ] Write 3 JOIN queries on paper

---

## Day 8 - NestJS + SQL deep

Goal: backend interview readiness for VetApp / Wizer / Travel2Georgia.

- [ ] [nestjs/02-rest-validation-swagger.md](./nestjs/02-rest-validation-swagger.md)
- [ ] [nestjs/03-auth-jwt-rbac.md](./nestjs/03-auth-jwt-rbac.md)
- [ ] [nestjs/05-typeorm-persistence.md](./nestjs/05-typeorm-persistence.md)
- [ ] [sql-databases/02-indexing-performance.md](./sql-databases/02-indexing-performance.md)
- [ ] [sql-databases/03-transactions-consistency.md](./sql-databases/03-transactions-consistency.md)

**End-of-day check**
- [ ] JWT access/refresh + RBAC design
- [ ] N+1 explanation + index choice
- [ ] Transaction/isolation answer for transfers

---

## Day 9 - Nest realtime/runtime + SQL wrap + Next.js

Goal: finish backend core; cover Next for Clean House / Travel2Georgia.

- [ ] [nestjs/04-websockets-realtime.md](./nestjs/04-websockets-realtime.md)
- [ ] [nestjs/06-nodejs-runtime.md](./nestjs/06-nodejs-runtime.md)
- [ ] [nestjs/07-interview-questions.md](./nestjs/07-interview-questions.md)
- [ ] [sql-databases/04-postgres-vs-mysql.md](./sql-databases/04-postgres-vs-mysql.md)
- [ ] [sql-databases/05-interview-questions.md](./sql-databases/05-interview-questions.md)
- [ ] [nextjs/INDEX.md](./nextjs/INDEX.md)
- [ ] [nextjs/01-routing-rendering.md](./nextjs/01-routing-rendering.md)

**End-of-day check**
- [ ] WebSockets vs FCM decision
- [ ] VetApp Nest rewrite STAR
- [ ] Server vs Client Components explanation

---

## Day 10 - Next.js + DevOps

Goal: fullstack + deploy confidence.

- [ ] [nextjs/02-data-fetching-caching.md](./nextjs/02-data-fetching-caching.md)
- [ ] [nextjs/03-middleware-auth-apis.md](./nextjs/03-middleware-auth-apis.md)
- [ ] [nextjs/04-performance-deployment.md](./nextjs/04-performance-deployment.md)
- [ ] [nextjs/05-interview-questions.md](./nextjs/05-interview-questions.md)
- [ ] [devops-cloud/INDEX.md](./devops-cloud/INDEX.md)
- [ ] [devops-cloud/01-docker.md](./devops-cloud/01-docker.md)
- [ ] [devops-cloud/02-nginx-ssl-vps.md](./devops-cloud/02-nginx-ssl-vps.md)

**End-of-day check**
- [ ] Next vs Nest API boundary answer
- [ ] Travel2Georgia Docker/Nginx/SSL story
- [ ] Caching pitfalls answer

---

## Day 11 - DevOps finish + full mock day

Goal: glue knowledge + simulate interviews.

Morning (study)
- [ ] [devops-cloud/03-aws-s3-sns.md](./devops-cloud/03-aws-s3-sns.md)
- [ ] [devops-cloud/04-git-ci-basics.md](./devops-cloud/04-git-ci-basics.md)
- [ ] [devops-cloud/05-interview-questions.md](./devops-cloud/05-interview-questions.md)

Afternoon (mocks - do all)
- [ ] Mock 1 (45m): DSA mediums
- [ ] Mock 2 (45m): React Native Bridge/Turbo Modules + performance
- [ ] Mock 3 (45m): System design EasyPay mobile
- [ ] Mock 4 (45m): NestJS auth + SQL transactions
- [ ] Mock 5 (30m): Behavioral (use RN ch.14 scripts)

**End-of-day check**
- [ ] List weak topics for Day 12 repair

---

## Day 12 - Weak-spot repair + final story polish

Goal: close gaps only. Do not learn random new topics.

- [ ] Re-read Senior sections of your weakest 4 files
- [ ] Re-draw: Bridge vs Turbo Modules
- [ ] Re-draw: Nest request pipeline (middleware/guards/pipes/interceptors/filters)
- [ ] Re-draw: EasyPay navigation + auth gating
- [ ] Rehearse all crash-rate stories with numbers
- [ ] Rehearse Travel2Georgia + VetApp + Clean House
- [ ] Light DSA only (2h max)
- [ ] Sleep early before real interviews

---

## Absolute order (single checklist)

Use this if you prefer one flat list with no day splits.

### Foundations
1. [ ] `typescript-javascript/01-javascript-fundamentals.md`
2. [ ] `typescript-javascript/02-async-event-loop.md`
3. [ ] `typescript-javascript/03-typescript-core.md`
4. [ ] `typescript-javascript/04-typescript-advanced.md`
5. [ ] `typescript-javascript/05-interview-questions-drills.md`
6. [ ] `react/01-rendering-reconciliation.md`
7. [ ] `react/02-hooks-deep-dive.md`
8. [ ] `react/03-state-data-fetching.md`
9. [ ] `react/04-performance-patterns.md`
10. [ ] `react/05-forms-ui-css.md`
11. [ ] `react/06-interview-questions.md`

### React Native (core)
12. [ ] `react-native/01-fundamentals.md`
13. [ ] `react-native/02-architecture.md`
14. [ ] `react-native/03-state-management.md`
15. [ ] `react-native/04-navigation.md`
16. [ ] `react-native/05-networking.md`

### React Native (CV differentiator - keep this order)
17. [ ] `react-native/15-bridge.md`
18. [ ] `react-native/16-native-modules.md`
19. [ ] `react-native/17-turbo-modules.md`
20. [ ] `react-native/07-native-modules.md`
21. [ ] `react-native/06-performance.md`

### Native platform literacy (host OS — Android + iOS)
- [ ] `native-developement/INDEX.md`
- [ ] `native-developement/01-android.md`
- [ ] `native-developement/02-ios.md`
- [ ] `native-developement/03-android-vs-ios.md`
- [ ] `native-developement/05-storage-background-security.md`
- [ ] `native-developement/06-debug-playbook.md`
- [ ] `native-developement/04-interview-questions.md`

### React Native (production)
22. [ ] `react-native/08-push-firebase-device.md`
23. [ ] `react-native/09-forms-ux-fintech.md`
24. [ ] `react-native/10-testing.md`
25. [ ] `react-native/11-cicd-releases.md`
26. [ ] `react-native/12-upgrades-stability.md`
27. [ ] `react-native/13-security.md`
28. [ ] `react-native/14-behavioral-stories.md`

### Backend
29. [ ] `nestjs/01-nestjs-architecture.md`
30. [ ] `sql-databases/01-sql-fundamentals.md`
31. [ ] `nestjs/02-rest-validation-swagger.md`
32. [ ] `nestjs/03-auth-jwt-rbac.md`
33. [ ] `nestjs/05-typeorm-persistence.md`
34. [ ] `sql-databases/02-indexing-performance.md`
35. [ ] `sql-databases/03-transactions-consistency.md`
36. [ ] `nestjs/04-websockets-realtime.md`
37. [ ] `nestjs/06-nodejs-runtime.md`
38. [ ] `nestjs/07-interview-questions.md`
39. [ ] `sql-databases/04-postgres-vs-mysql.md`
40. [ ] `sql-databases/05-interview-questions.md`

### Next.js + DevOps
41. [ ] `nextjs/01-routing-rendering.md`
42. [ ] `nextjs/02-data-fetching-caching.md`
43. [ ] `nextjs/03-middleware-auth-apis.md`
44. [ ] `nextjs/04-performance-deployment.md`
45. [ ] `nextjs/05-interview-questions.md`
46. [ ] `devops-cloud/01-docker.md`
47. [ ] `devops-cloud/02-nginx-ssl-vps.md`
48. [ ] `devops-cloud/03-aws-s3-sns.md`
49. [ ] `devops-cloud/04-git-ci-basics.md`
50. [ ] `devops-cloud/05-interview-questions.md`

### Final
51. [ ] Full mock day
52. [ ] Weak-spot repair day

---

## If you only have 5 days

Do this compressed path only:

1. Day 1: TS/JS `01-03` + React `01-02`
2. Day 2: React `03-06` + RN `01-05`
3. Day 3: RN `15 -> 16 -> 17 -> 07 -> 06 -> 12 -> 14` (+ `native-developement/03` tables if they ask Gradle/Xcode)
4. Day 4: Nest `01-03,05` + SQL `01-03`
5. Day 5: Next `01-03` + DevOps `01-02` + mocks + stories

---

## If interview is RN-only tomorrow

Emergency order (one day):

1. `react-native/01-fundamentals.md`
2. `react-native/15-bridge.md`
3. `react-native/16-native-modules.md`
4. `react-native/17-turbo-modules.md`
5. `react-native/06-performance.md`
6. `react-native/03-state-management.md`
7. `react-native/04-navigation.md`
8. `react-native/12-upgrades-stability.md`
9. `react-native/14-behavioral-stories.md`
10. `native-developement/03-android-vs-ios.md` + `04-interview-questions.md` (45 min if they probe Studio/Xcode)
11. `native-developement/06-debug-playbook.md` if they ask “walk a native crash”

---

## Progress

- [ ] Day 1 done
- [ ] Day 2 done
- [ ] Day 3 done
- [ ] Day 4 done
- [ ] Day 5 done (Bridge / Native / Turbo)
- [ ] Native platform literacy done (Android + iOS host)
- [ ] Day 6 done
- [ ] Day 7 done
- [ ] Day 8 done
- [ ] Day 9 done
- [ ] Day 10 done
- [ ] Day 11 mocks done
- [ ] Day 12 repair done
