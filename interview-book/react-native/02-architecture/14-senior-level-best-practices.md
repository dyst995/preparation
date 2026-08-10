# 14. Senior-Level Best Practices

> Source: `interview-prep/react-native/02-architecture.md`

### Decision framework: feature-based vs type-based, and when to reorganize mid-flight

| Signal | Decision |
|---|---|
| New app, team size 2+ | Start feature-based from day one - the EasyPay pattern |
| Existing type-based app, < 5 screens, stable | Not worth a structural migration yet - low cohesion pain |
| Existing type-based app, crash rate high, frequent cross-team merge conflicts in `components/`/`screens/` | Migrate via strangler pattern - this is exactly the MyCreditInfo/Wizer situation |
| Multiple squads shipping independently | Feature-based is close to mandatory - ownership boundaries need to map to folder boundaries |
| Single developer, prototype/MVP | Don't over-engineer folders; a light type-based structure is fine until product-market fit |

### Production checklist (architecture-level, ship-ready)

- [ ] Every feature folder has a single `index.ts` public surface; nothing outside the feature imports from its internals directly
- [ ] A written (even one-page) dependency rule doc exists: what can import what, and it is enforced by lint (e.g. `eslint-plugin-boundaries` or import restriction rules), not just tribal knowledge
- [ ] App shell (`app/`) contains only bootstrap/providers/navigation root - zero business screens leaking in
- [ ] Boot sequence is explicit and ordered (crash reporting -> auth hydrate -> analytics -> navigation mount -> deferred non-critical init), not implicit React mount-order accidents
- [ ] Environment/flavor config is typed and centralized - no `process.env.SOMETHING` scattered through feature code
- [ ] Secrets audit done: nothing privileged sits in the JS bundle or a `.env` that ships to the client
- [ ] A design-system extraction threshold is documented (e.g. "3+ features repeat a pattern") so the team doesn't debate it ad hoc every time

### Anti-patterns seniors reject in code review

- **Cross-feature deep imports** (`import { formatBalance } from '../../wallet/model/helpers'`) instead of going through the feature's public API - creates a hidden dependency graph nobody can reason about.
- **A "big bang rewrite" pitched as the first option for a legacy codebase.** Seniors default to the strangler pattern: the app must stay shippable every week during modernization.
- **Global Redux/Zustand store used as an architecture substitute** - "let's just put it in the global store" instead of deciding which layer (feature model, shared, app) actually owns the data.
- **`shared/` becoming a junk drawer.** If `shared/utils.ts` has 40 unrelated functions, it's not shared code anymore, it's an un-owned dumping ground - split it back into features or name it precisely (`shared/lib/money`, `shared/lib/http`).
- **Extracting a design system before there's real repetition.** Premature abstraction produces an over-engineered component API that fights every new screen's actual requirements.
- **Skipping ADRs for architecture-defining decisions** ("why feature-based," "why this native/JS boundary") - the reasoning gets lost and gets re-litigated by every new senior hire.

### Failure modes & how seniors debug them

| Symptom | Likely root cause | How to diagnose | Fix |
|---|---|---|---|
| Every PR touches files across 5+ unrelated folders | Type-based structure with no cohesion | Look at the last 20 PRs' file-change spread | Migrate the highest-churn area to a feature folder first |
| New engineer takes weeks to ship their first feature | Unclear ownership boundaries, undocumented dependency rules | Onboarding retro / exit interview feedback | Write the one-page dependency rule doc + example feature template |
| Circular import errors appear randomly during refactors | No enforced import direction between features/shared/app | Dependency graph tool (`madge`, `dpdm`) | Add lint rule for import boundaries, break the cycle by lifting the shared contract |
| A "small" flavor/env change breaks staging silently | Config not centralized/typed - a hardcoded URL or flag somewhere in a feature | Grep for hardcoded URLs/keys across the codebase | Centralize into a typed config module, add a CI check that fails on hardcoded endpoints |
| Adding a new white-label/flavor takes a full sprint each time | No theming/config abstraction, features reference hardcoded brand values | Audit for hardcoded colors/copy/package names | Introduce tokens + flavor config layer once, amortized over every future flavor |

### Observability / metrics for architecture health

- **PR file-change spread**: how many unrelated top-level folders does a typical PR touch? Rising trend = cohesion decay.
- **Time-to-first-shipped-feature for new hires** - a strong proxy for how discoverable and well-bounded the architecture actually is.
- **Cross-feature import count** (via a dependency graph tool) tracked over time - should stay flat or shrink, not silently grow.
- **Build/CI time trend** - a tangled dependency graph often correlates with slower incremental builds and test runs.
- **Number of "which folder does this go in?" review comments** - a soft but real signal that boundaries aren't self-evident.

### Scalability & team practices

- **Module boundary linting is enforced in CI**, not just documented in a README that nobody rereads after week one.
- **Feature ownership maps 1:1 to folders** where possible, so code review assignment and on-call rotation follow the same mental model as the file tree.
- **ADRs for every irreversible-ish decision**: feature-based vs type-based, state stack choice, native module boundary rules, environment strategy. Short (half a page), dated, and revisited only when circumstances actually change.
- **"No new code in legacy folders" is a reviewable, enforceable rule** during a strangler migration - not an aspiration. Bots/lint can flag PRs that add to a designated legacy path.
- **Quarterly dependency review** - dead native modules and abandoned libraries are architecture debt too; they block New Architecture migration and inflate the app.
- **A documented boot sequence and startup runbook** so incident response during a bad release doesn't require reverse-engineering provider mount order under pressure.

### Tradeoffs table

| Choice | Pro | Con |
|---|---|---|
| Feature-based architecture | High cohesion, safer refactors, clear ownership | Requires discipline about `shared/`; can over-segment if applied dogmatically to a tiny app |
| Strangler migration of legacy app | App stays shippable every week, lower risk | Slower than a rewrite in the short term; requires holding two mental models temporarily |
| Centralized typed config module | One source of truth, easy env/flavor swaps | Slight upfront setup cost vs scattering `process.env` reads |
| Extracting design system early | Consistency, easier fintech-grade accessibility/trust | Risk of an abstraction that doesn't fit real screen requirements yet |
| Monorepo packages for shared UI/core | Clear ownership across multiple apps/teams | Overhead not justified for a single app/small team |

### Harder follow-up interview questions (with model answers)

**Q: You inherit a codebase where `shared/` has grown into a 200-file junk drawer. How do you fix it without a big rewrite?**

> "I wouldn't try to fix it in one PR. I'd start by categorizing what's actually in there - true cross-feature primitives vs single-feature code that got dumped there out of habit. I'd move single-feature code back into its feature as I touch those areas naturally during regular work, and only keep genuinely shared, well-named modules (`shared/lib/http`, `shared/ui/tokens`) in `shared/`. I'd add a lint rule going forward so new code can't get added to an un-scoped `shared/utils.ts` again. This is the same incremental, always-shippable philosophy as the strangler pattern I used on MyCreditInfo and Wizer."

**Q: How do you decide when a feature is big enough to be split into two separate features?**

> "When its internal folders (screens, hooks, api) stop having a single clear responsibility, or when two sub-teams are stepping on each other inside the same feature folder in code review. A concrete signal is when the feature's public `index.ts` starts exporting things for two genuinely different business capabilities - that's the seam where I'd split it."

**Q: A stakeholder wants a white-labeled second app from your existing fintech app in 6 weeks. How does your architecture help or hurt that timeline?**

> "If theming, copy, and config were already abstracted into tokens and a flavor system rather than hardcoded, this becomes a config and asset exercise, not a code fork - a few weeks is realistic. If the codebase never had that abstraction, I'd push back on the timeline and scope the first sprint to extract tokens/flavors properly, because forking the whole repo creates a permanent double-maintenance burden that costs far more than the extra two weeks up front."

**Q: How do you prevent architecture decisions made today from silently becoming wrong in a year?**

> "I write short ADRs so the reasoning and the constraints at the time are recorded, and I schedule a lightweight periodic review - part of the quarterly dependency review - to ask whether the original assumptions still hold. Architecture decay is rarely a single bad decision; it's small deviations compounding without anyone noticing, so I'd rather catch drift in a scheduled review than in a production incident."

**Q: What's a case where feature-based architecture is the wrong call?**

> "A very small app or an early-stage MVP where you don't yet know your feature boundaries - forcing a feature-based structure prematurely can create folders that get reshuffled every week as the product pivots. In that phase I'd keep a lighter structure and defer the feature-based reorganization until the product's real boundaries stabilize, which is usually after the first few months of iteration."

### What I'd say in a staff/senior interview

> "Architecture decisions are really risk-management decisions in disguise. When I chose feature-based structure for EasyPay from scratch, or migrated MyCreditInfo and Wizer away from a type-based junk-drawer structure, the real goal wasn't aesthetic folder organization - it was reducing the blast radius of every change, making ownership legible to a growing team, and keeping the app shippable every single week during a migration instead of betting everything on a big-bang rewrite. I measure architecture health the same way I measure performance: with concrete signals - PR file-change spread, time-to-first-feature for new hires, cross-feature import counts - not vibes. And I write decisions down as ADRs, because the biggest failure mode I've seen on legacy teams isn't a bad decision, it's a good decision nobody remembers the reasoning for two years later."

---
