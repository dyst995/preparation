# 04. Online School - deadline pressure + CI/CD + crash reduction

> Source: `interview-prep/react-native/14-behavioral-stories.md`

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
