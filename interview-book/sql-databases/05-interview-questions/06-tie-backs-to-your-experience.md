# 06. Tie-backs to your experience

> Source: `interview-prep/sql-databases/05-interview-questions.md`

- The VetApp schema in this chapter is essentially the real shape of what you built: appointment scheduling, veterinary records, payment processing, all backed by relational tables with foreign keys under NestJS + TypeORM + MySQL.
- The EasyPay schema translates your real product knowledge (QR payments, money transfers, wallet management, loans management, biometric auth) into a backend data model - even if you didn't personally own that schema, you can speak to it with real product context that most candidates faking this domain would not have.
- Payment integration experience (Bank of Georgia on VetApp, Flitt on Wizer) gives you genuine grounding for "how would you model a payment/webhook status update" follow-ups - status fields with a small enum plus a timestamp, updated by a webhook handler that should be idempotent.

---
