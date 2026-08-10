# 10. Tie-backs to your experience

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

- VetApp's payment processing (Bank of Georgia integration) is exactly the kind of feature where atomicity and isolation matter: recording a payment and updating an appointment/invoice status need to happen together, and you should be ready to describe how you'd wrap that in a transaction.
- Background jobs for asynchronous processing (also on VetApp) often need idempotency and careful transaction boundaries - a natural follow-up question is "what if the job runs twice," which ties directly into designing safe, transactional writes.
- EasyPay's wallet management, money transfers, and loans management are the canonical "concurrency and correctness matter" domain - you can speak to this even if the backend wasn't yours directly, by reasoning about how you'd build the API safely from the client side (e.g. idempotency keys on transfer requests) and from a backend design perspective.

---
