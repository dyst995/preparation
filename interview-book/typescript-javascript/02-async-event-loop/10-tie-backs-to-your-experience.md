# 10. Tie-backs to your experience

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

- Search-as-you-type, tab-switching data fetches, and pull-to-refresh in RN apps are classic race-condition surfaces - describing a real fix (abort/ignore-stale-response) is a strong, concrete story.
- NestJS service/controller methods being `async` by convention means every unhandled rejection risk in this chapter applies directly to backend request handling - global exception filters are the safety net, but understanding *why* you still need try/catch in services matters.
- Parallelizing independent `await` calls is a cheap, real performance win you can point to in dashboard/profile-loading screens.

---
