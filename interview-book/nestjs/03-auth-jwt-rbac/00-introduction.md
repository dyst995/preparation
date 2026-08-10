# 03 - Auth: JWT Access/Refresh, Guards, Passport Strategies, RBAC — Introduction

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

> Goal: design and defend a full authentication + authorization system end to end - the kind of system you actually built for VetApp - at a depth that survives senior security follow-ups.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain JWT structure, signing, and why access + refresh tokens exist as a pair.
2. Implement and explain Passport strategies (`local`, `jwt`) inside Nest.
3. Explain guards end to end: `CanActivate`, `ExecutionContext`, custom guards.
4. Design and implement RBAC with custom decorators + a `RolesGuard` (VetApp: admin/vet/receptionist).
5. Design a secure refresh-token rotation and revocation flow.
6. Explain password security at a high level (hashing, salting, rate limiting) without needing to reinvent crypto.
7. Tell a clear, confident VetApp auth/RBAC story for behavioral rounds.

---
