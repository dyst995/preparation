# 08. Hands-on drills

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

- [ ] Write a script that logs the order of `process.nextTick`, `Promise.resolve().then()`, `setTimeout(fn, 0)`, and `setImmediate(fn)` - run it and confirm the ordering matches your mental model.
- [ ] Implement a streamed file upload handler using `pipeline()` and verify memory stays flat for a large file.
- [ ] Configure PM2 in cluster mode locally (`pm2 start dist/main.js -i max`) and confirm requests are load-balanced across workers.
- [ ] Implement `app.enableShutdownHooks()` + an `OnApplicationShutdown` hook that closes a DB connection; send `SIGTERM` and confirm it fires.
- [ ] Set up a BullMQ queue + processor for a fake "send confirmation" job with retries and backoff; force a failure and watch the retry behavior.
- [ ] Write a `@Cron()` reconciliation job skeleton and explain out loud why it exists alongside webhooks.

---
