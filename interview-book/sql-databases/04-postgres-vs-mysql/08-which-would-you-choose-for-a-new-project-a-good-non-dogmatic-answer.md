# 08. "Which would you choose for a new project" - a good, non-dogmatic answer

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

There's no universally correct answer, and pretending there is one is itself a red flag. A strong answer sounds like:

> "For a greenfield project without a specific reason to do otherwise, I lean Postgres, mainly for JSONB, native arrays, stronger full-text search, and its extension ecosystem if there's any chance of needing geospatial or advanced querying later. But if the team already has deep MySQL operational expertise, or we're integrating with an existing MySQL system - like I did on VetApp, where I had to preserve compatibility with an existing production database - I'd stick with MySQL rather than introduce a second database technology for no strong reason. Constraints and existing infrastructure usually matter more than a slight technical edge either way."

This answer is strong because it: (1) has an actual opinion, (2) explains why, (3) shows you'd adapt to real constraints, and (4) ties to a real, verifiable project of yours.

---
