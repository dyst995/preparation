# 02 — Architecture & Project Structure

> Goal: Design and defend a scalable React Native architecture — especially **feature-based** structure — the way you did when modernizing legacy apps and green-fielding EasyPay.

---

## Learning objectives

1. Defend feature-based architecture vs type-based folders.
2. Draw a clean layering model: UI ? application/domain ? data ? native.
3. Structure navigation for auth and main app without spaghetti.
4. Define dependency rules so features don’t become a tangled graph.
5. Know when to extract a design system.
6. Handle environments/flavors professionally (dev/staging/prod).
7. Tell a crisp story about refactoring a legacy RN codebase.

---

## 1. Why architecture matters in RN interviews

Interviewers aren’t only asking “where do files go?” They’re testing whether you can:

- Scale a team beyond one developer
- Keep features shippable without breaking unrelated areas
- Modernize legacy code without a big-bang rewrite
- Separate UI from business rules and native details
- Make onboarding and code review faster

Your CV already claims this repeatedly (EasyPay from scratch, Wizer/MyCreditInfo/Online School modernization). This section turns those claims into explainable engineering.

---

## 2. Type-based vs feature-based architecture

### Type-based (common in early apps)

```text
src/
  components/
  screens/
  hooks/
  services/
  utils/
  store/
```

**Pros**
- Easy to start
- Familiar to beginners

**Cons**
- Related code is scattered
- Changes to one feature touch many folders
- Hard to delete/refactor a feature safely
- Encourages a junk-drawer `utils/` and giant `components/`

### Feature-based (what you should defend)

```text
src/
  app/                    # app shell: providers, navigation root, config
  shared/                 # truly cross-feature primitives
    ui/
    lib/
    hooks/
    types/
  features/
    auth/
      api/
      model/
      ui/
      screens/
      hooks/
      index.ts             # public API of the feature
    wallet/
    payments/
    transfers/
    profile/
```

**Pros**
- High cohesion: everything for payments lives together
- Easier ownership by squads
- Easier to lazy-load or isolate
- Refactors are localized
- Public `index.ts` can hide internals

**Cons**
- Requires discipline about shared code
- Over-segmentation can create tiny noisy folders
- Need clear rules for cross-feature imports

### Interview answer

> “I prefer feature-based architecture for production apps. Each feature owns its screens, UI pieces, hooks, API calls, and domain logic. Shared code is only what is genuinely reused. This is how I modernized legacy apps: instead of a giant screens/components soup, we moved boundaries around business capabilities — wallet, auth, feed, etc. — which improved maintainability and reduced regression risk.”

---

## 3. Recommended layering inside a feature

Even inside `features/payments/`, separate concerns:

```text
features/payments/
  ui/           # presentational components
  screens/      # route-level composition
  hooks/        # view-model-ish hooks
  model/        # types, validators, pure domain helpers
  api/          # REST/React Query endpoints
  native/       # feature-specific native wrappers (if needed)
  index.ts      # export only what other features may use
```

### Dependency direction (important)

```text
screens ? hooks ? api/model
ui ? hooks/screens
shared ? features (features may import shared)
features should NOT freely import other features’ internals
```

Cross-feature communication options:
1. Import from the other feature’s **public** `index.ts` only
2. Lift shared contracts into `shared/`
3. Use app-level events/navigation params carefully (don’t build a global event bus unless needed)

---

## 4. App shell responsibilities

`app/` (or `src/app`) should own:

- [ ] Providers composition (`QueryClientProvider`, store providers, SafeArea, theme)
- [ ] Root navigation container
- [ ] Global error boundaries
- [ ] Bootstrap/startup sequencing (fonts, remote config, auth hydrate)
- [ ] Environment config access
- [ ] Global linking config

Avoid dumping business screens into `app/`.

### Startup sequence (interview gold)

Be ready to describe a safe boot order:

1. Load native minimum / splash stays up
2. Init crash reporting
3. Hydrate auth/session from secure storage
4. Init analytics (after consent if required)
5. Mount navigation with correct auth state
6. Defer non-critical init (prefetch, secondary SDKs)

This connects to performance and crash reduction stories.

---

## 5. Navigation architecture as part of app architecture

### Pattern: separate auth stack and app stack

```text
RootNavigator
  if !hydrated: Splash/Bootstrap
  if !authenticated: AuthStack
  else: AppStack (tabs/drawer + nested stacks)
```

### Why this matters

- Prevents “go back to Login” bugs
- Makes deep links easier to reason about
- Clarifies ownership of session state

### Topics to learn
- [ ] Conditional navigators vs runtime redirect hacks
- [ ] Where session state lives (auth feature + secure storage)
- [ ] How payment flows get their own nested stack
- [ ] Modal flows vs push flows

---

## 6. Shared UI / design system — when to extract

### Don’t extract too early

If you have 2 buttons with similar padding, you don’t need a design system.

### Do extract when

- [ ] Multiple features repeat the same visual language
- [ ] Product has a UI kit / Figma library
- [ ] You need accessibility and consistency for fintech trust
- [ ] Cross-squad contribution needs constraints

### Design system contents (practical)

- Tokens: colors, spacing, typography, radii
- Primitives: Button, TextField, ListRow, Screen, InlineError
- Patterns: EmptyState, LoadingState, ErrorState
- Rules: no raw hex in features if tokens exist

### Interview answer

> “I extract a shared UI kit when repetition and inconsistency become real costs. I keep it at primitives + tokens first, not a gigantic abstraction layer. Feature-specific composites stay in the feature until they’re reused.”

---

## 7. Data and domain boundaries

### Topics to learn
- [ ] API DTOs vs UI models
- [ ] Mapping/adapters at the boundary
- [ ] Keeping money/calculation logic pure and tested
- [ ] Avoiding “god” API service files

### Example rule

- `api/` returns typed DTO
- `model/mappers.ts` converts to domain/UI model
- Screens never do ad-hoc field renaming everywhere

This becomes critical in fintech (balances, statuses, payment states).

---

## 8. Environments, flavors, and config

### Topics to learn
- [ ] dev / staging / prod backends
- [ ] Separate bundle IDs / applicationIds for side-by-side installs (often useful)
- [ ] `.env` strategies and what must NOT go in env (secrets)
- [ ] Build-time vs runtime config
- [ ] Feature flags / remote config for risky rollouts

### What belongs in config

- API base URLs
- Feature flag defaults
- Analytics keys that are public by nature
- Deep link hostnames

### What does not

- Private API secrets that grant privileged access
- Raw production signing passwords in JS
- Anything that would be catastrophic if extracted from the bundle

### Interview question

**Q: How do you manage environments in RN?**

> “I use build flavors/schemes for platform identity and compile-time config, plus a small typed config module. Staging and prod are clearly separated. Secrets that must remain private stay off-device or in secure native storage flows. For risky features I prefer remote flags so I can disable without waiting for store review when appropriate.”

---

## 9. Legacy modernization playbook (your strongest architecture story)

Use this structure in interviews:

### Step 0 — Characterize the patient
- Crash rate, ANRs, startup time
- Hotspots (god screens, dead dependencies)
- Platform versions and RN version
- Business critical flows

### Step 1 — Establish seams
- Introduce `features/` gradually
- Stop adding new code to legacy piles
- Add lint boundaries if possible (module boundaries)

### Step 2 — Strangle, don’t big-bang rewrite
- Move one vertical slice at a time (e.g. Stories, then Premium)
- Keep app shippable every week
- Add characterization tests around risky areas when feasible

### Step 3 — Stabilize platform
- Crashlytics hygiene
- CI signing/release confidence
- Remove unused native dependencies

### Step 4 — Measure
- Crash-free users
- Startup
- Key conversion flows

Map to CV:
- **MyCreditInfo**: outdated codebase ? feature-based + crash collapse
- **Wizer**: ownership + architecture + native capability
- **Online School**: modernization + deadline ownership
- **EasyPay**: green-field architecture done right from day one

---

## 10. Example target structure for a fintech app (EasyPay-like)

```text
src/
  app/
    providers/
    navigation/
    bootstrap/
  shared/
    ui/
    lib/http/
    lib/secure-storage/
    lib/money/
    hooks/
  features/
    auth/
    onboarding/
    wallet/
    qr-payments/
    transfers/
    loans/
    notifications/
    profile/
  native/                 # thin wrappers around native modules used app-wide
```

Be ready to draw this on a whiteboard in 60 seconds.

---

## Interview question bank (detailed)

### Q1. How would you structure a mid-size fintech RN app from scratch?

**Answer framework:**
1. App shell + providers
2. Feature folders by business capability
3. Shared UI tokens/primitives
4. Auth-conditioned navigation
5. React Query for server state, small client store for UI/session extras
6. Secure storage for tokens
7. Native module boundary isolated
8. CI + staging flavor from day one

### Q2. Why feature-based over `components/` + `screens/`?

High cohesion, easier ownership, safer refactors, better scalability. Give a legacy pain example.

### Q3. How do features communicate?

Public exports, shared contracts, navigation params for flow state, server as source of truth for business data. Avoid circular imports.

### Q4. Where do you put reusable buttons and form controls?

`shared/ui` if generic; feature UI if domain-specific (e.g. `TransferAmountInput`).

### Q5. How do you prevent architecture decay?

- Module boundary linting
- Code review checklists
- “No new code in legacy folders”
- Periodic dependency reviews
- Keep features’ public APIs narrow

### Q6. Walk through modernizing a legacy RN app.

Use the strangler playbook above + your crash metrics.

### Q7. How do you handle multiple products/white-labels?

Flavors, theming tokens, feature flags, careful native package naming. Don’t fork the whole repo if avoidable.

### Q8. When is microfrontends/package-splitting worth it in RN?

Usually later: monorepo packages for shared UI/core when multiple apps or teams need clear ownership. Not a day-one requirement for one app.

---

## Hands-on drills

- [ ] Draw EasyPay architecture from memory (boxes + arrows).
- [ ] Take any old RN folder structure and rewrite it as feature-based on paper.
- [ ] Write dependency rules in one page: what can import what.
- [ ] Prepare a 2-minute “legacy modernization” monologue with metrics.
- [ ] Define boot sequence for an authenticated fintech app.

---

## Green flags / red flags

**Green**
- Clear boundaries and tradeoffs
- Incremental migration strategy
- Metrics tied to architecture work
- Distinguishes shared UI from domain features

**Red**
- “Folders don’t matter”
- Big-bang rewrite as the first answer
- Everything in Redux global store “for architecture”
- Circular feature imports with no rules

---

## Mastery checklist

- [ ] I can defend feature-based architecture with tradeoffs
- [ ] I can draw a fintech RN architecture whiteboard cleanly
- [ ] I can explain dependency direction and public feature APIs
- [ ] I can describe environment/flavor strategy
- [ ] I can tell MyCreditInfo/Wizer/EasyPay architecture stories without rambling
