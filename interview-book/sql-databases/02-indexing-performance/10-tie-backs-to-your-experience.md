# 10. Tie-backs to your experience

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

- On VetApp, appointment scheduling and payment queries are exactly the shape of "filter by vet/date range, join to related entities" that benefit from the composite index patterns in this chapter.
- Using TypeORM in a real backend means you have almost certainly hit lazy-relation-driven N+1 (or narrowly avoided it) - be ready to describe how you structured `relations`/`leftJoinAndSelect` for the appointment or payment endpoints.
- You also improved network/rendering performance on the mobile side (MyCreditInfo: lazy loading, HTTP caching with ETags) - you can bridge that story to backend performance thinking: "I already think about avoiding redundant round trips on the client; the same instinct applies to avoiding N+1 round trips to the database."

---
