# 09. Legacy modernization playbook (your strongest architecture story)

> Source: `interview-prep/react-native/02-architecture.md`

Use this structure in interviews:

### Step 0 � Characterize the patient
- Crash rate, ANRs, startup time
- Hotspots (god screens, dead dependencies)
- Platform versions and RN version
- Business critical flows

### Step 1 � Establish seams
- Introduce `features/` gradually
- Stop adding new code to legacy piles
- Add lint boundaries if possible (module boundaries)

### Step 2 � Strangle, don�t big-bang rewrite
- Move one vertical slice at a time (e.g. Stories, then Premium)
- Keep app shippable every week
- Add characterization tests around risky areas when feasible

### Step 3 � Stabilize platform
- Crashlytics hygiene
- CI signing/release confidence
- Remove unused native dependencies

### Step 4 � Measure
- Crash-free users
- Startup
- Key conversion flows

Map to CV:
- **MyCreditInfo**: outdated codebase ? feature-based + crash collapse
- **Wizer**: ownership + architecture + native capability
- **Online School**: modernization + deadline ownership
- **EasyPay**: green-field architecture done right from day one

---
