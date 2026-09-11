# Interview Prep - Master Index

Study materials based on **Nika Beroshvili's** CV stack.

**Start here for the learning sequence:** [order.md](./order.md)

**62 markdown files / ~24,000+ lines** across 8 technology tracks.

Each chapter includes: learning objectives, topic checklists, deep explanations, tables, interview Q&A with model answers, hands-on drills, green/red flags, CV tie-backs, and mastery checklists.

**47 content chapters** also include a **Senior-Level Best Practices** section with:
- decision frameworks and tradeoff tables
- production ship checklists
- anti-patterns seniors reject
- failure modes and debugging playbooks
- observability / metrics to watch
- team and scale practices
- harder staff/senior follow-up Q&A with model answers

---

## Tracks

| Folder | What's inside | From your CV | Priority |
|---|---|---|---|
| [react-native/](./react-native/REACT_NATIVE_INTERVIEW.md) | 17 chapters + index | RN, Bridge, Native Modules, Turbo Modules, Firebase, Fastlane, native Android/iOS | **Highest** |
| [typescript-javascript/](./typescript-javascript/INDEX.md) | 5 chapters + index | TypeScript, JavaScript | **High** (foundation) |
| [react/](./react/INDEX.md) | 6 chapters + index | React, Redux, React Query, Zustand, HTML/CSS/Tailwind | **High** |
| [nextjs/](./nextjs/INDEX.md) | 5 chapters + index | Next.js (Clean House, Travel2Georgia) | **High** |
| [nestjs/](./nestjs/INDEX.md) | 7 chapters + index | NestJS, Node, REST, WebSockets, JWT, Swagger, TypeORM | **High** |
| [sql-databases/](./sql-databases/INDEX.md) | 5 chapters + index | PostgreSQL, MySQL, SQL, TypeORM | **Medium-High** |
| [devops-cloud/](./devops-cloud/INDEX.md) | 5 chapters + index | Docker, AWS S3/SNS, Nginx, Git, SSL/VPS, CI | **Medium** |
| [native-developement/](./native-developement/INDEX.md) | 6 chapters + index | Android Gradle/Manifest/Activity; iOS Xcode/plist/signing; storage/backup; host debugging | **High** with RN (platform literacy) |

Working-knowledge languages (Kotlin, Swift, Java, Objective-C) are **not** separate language tracks. Read them inside [react-native/07-native-modules.md](./react-native/07-native-modules.md) and the [native-developement](./native-developement/INDEX.md) host-OS track (Gradle, Xcode, lifecycle, permissions).

---

## Chapter map (quick open)

### React Native
`01` Fundamentals | `02` Architecture | `03` State | `04` Navigation | `05` Networking | `06` Performance | `07` Native Integrations | `08` Push/Firebase | `09` Fintech UX | `10` Testing | `11` CI/CD | `12` Stability | `13` Security | `14` Behavioral | **`15` Bridge** | **`16` Native Modules** | **`17` Turbo Modules**

### TypeScript / JavaScript
`01` JS Fundamentals | `02` Async/Event Loop | `03` TS Core | `04` TS Advanced | `05` Q&A Drills

### React
`01` Rendering | `02` Hooks | `03` State/Data | `04` Performance | `05` Forms/UI/CSS | `06` Q&A Bank

### Next.js
`01` Routing/Rendering | `02` Data/Caching | `03` Middleware/Auth/APIs | `04` Perf/Deploy | `05` Q&A + Stories

### NestJS
`01` Architecture/DI | `02` REST/Validation/Swagger | `03` Auth/JWT/RBAC | `04` WebSockets | `05` TypeORM | `06` Node Runtime | `07` Q&A + STAR

### SQL / Databases
`01` SQL Fundamentals | `02` Indexing/Perf | `03` Transactions | `04` Postgres vs MySQL | `05` Q&A + Schema Design

### DevOps / Cloud
`01` Docker | `02` Nginx/SSL/VPS | `03` AWS S3/SNS | `04` Git/CI | `05` Q&A + Deploy Stories

### Native development (Android + iOS)
`01` Android | `02` iOS | `03` Android vs iOS tables | `04` Spoken Q&A | `05` Storage/background/security | `06` Debug playbook — [track index](./native-developement/INDEX.md)

---

## Suggested study order (8-10h/day)

### Phase A - Foundations (Day 1-2)
1. `typescript-javascript/`
2. `react/` (rendering + hooks first)

### Phase B - Product stack (Day 3-5)
3. `react-native/` (your strongest differentiator - go deep)
4. `nestjs/` + `sql-databases/`
5. `nextjs/`

### Phase C - Senior glue (Day 6-7)
6. `native-developement/` (after RN native modules — Gradle/Xcode host literacy)
7. `devops-cloud/`
8. Behavioral stories (RN ch.14 + Nest/Next STAR sections)

### Phase D - Mocks (Day 8+)
Timed coding + system design for: **EasyPay**, **Clean House**, **VetApp**, **Online School**, **Travel2Georgia**

---

## How to use each chapter

1. Read explanations
2. Check off topics you can teach out loud
3. Answer interview questions without notes
4. Study the **Senior-Level Best Practices** section last - that is the staff bar
5. Do hands-on drills
6. Rehearse CV stories with metrics

---

## Progress

- [ ] TypeScript / JavaScript
- [ ] React
- [ ] React Native
- [ ] NestJS / Node
- [ ] SQL / Databases
- [ ] Next.js
- [ ] DevOps / Cloud
- [ ] Native development (Android + iOS)
- [ ] DSA ([interview-dsa/](../interview-dsa/))

---

## Flashcards app

Practice with the web app in [`../flashcards-project/`](../flashcards-project/):

```bash
cd flashcards-project && npm install && npm run dev
```

Cards are auto-generated from interview-prep chapters. Only **real Q&A pairs** are included (questions with actual model answers from the docs) — no generic placeholder cards.

Default view in the app: **Q&A with answers**.

## Mock interviewer app

Timed AI mock interviews (text + live coding + voice) with end-of-session feedback, in [`../mock-interview/`](../mock-interview/):

```bash
cd mock-interview
cp .env.example .env.local   # add OPENAI_API_KEY
npm install && npm run dev
```

Uses the same markdown as the knowledge base; grades you against model answers and points you back to specific chapters.