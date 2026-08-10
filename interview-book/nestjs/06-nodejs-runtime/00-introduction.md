# 06 - Node.js Runtime: Event Loop, Streams, Clustering, Error Handling, Background Jobs — Introduction

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

> Goal: explain what's actually happening under a NestJS app at the Node.js level - the event loop, async model, process management, and background job processing (VetApp's payment/notification pipeline) - deeply enough to reason about performance and reliability, not just framework APIs.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain the Node.js event loop phases and the microtask/macrotask distinction.
2. Explain streams and backpressure, and identify where they matter in a typical backend (file uploads).
3. Explain clustering/PM2 and why/when to use multiple processes despite Node being single-threaded.
4. Design correct error handling at the process, framework, and async level.
5. Design a background job system (queues) and justify it with the VetApp payment/notification use case.
6. Recognize symptoms of a blocked event loop and know how to fix them.

---
