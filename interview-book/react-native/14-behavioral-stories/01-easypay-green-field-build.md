# 01. EasyPay - green-field build

> Source: `interview-prep/react-native/14-behavioral-stories.md`

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
