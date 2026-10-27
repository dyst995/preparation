# NEST07 — Async & distributed patterns

NestJS 10 with `@nestjs/bullmq` (BullMQ), `@nestjs/microservices`, `@nestjs/cqrs`, `@nestjs/websockets`, `@nestjs/schedule`, and `@nestjs/terminus`. Questions NEST-301–NEST-350.

Queues and background jobs, retries and backoff, transporters (TCP, Redis, NATS, Kafka), request-response versus events, CQRS lightly, saga choreography versus orchestration, the outbox, idempotent consumers, WebSocket gateways, server-sent events, `@Cron`, health across services, tracing hooks, app-level circuit breaking, message ordering, poison messages, and multi-instance deployment (sticky sessions and scheduled jobs).

### NEST-301 — Why a handler should queue slow work

**Difficulty:** Junior

**Category:** Queues

**Question:**

Why would a Nest HTTP handler put work on a queue instead of finishing it before the response?

**Answer:**

The request should return before slow work finishes. Mail, a payment partner, or a report can take seconds. Doing that inside the handler keeps the user waiting, holds the connection, and a spike can exhaust the process. A queue stores the job, and a worker runs it afterward. You also get retries and a record of failures. The response can only say the work was accepted, so the product needs a status the user can check later.

**Follow-up:**

What HTTP status fits a job that was only queued?

Answer: Use 202 Accepted. A 200 reads as if the email was already sent or the report was already built, and that is not true yet.

### NEST-302 — Bull and BullMQ in a Nest 10 app

**Difficulty:** Junior

**Category:** Queues

**Question:**

What is the difference between Bull and BullMQ when you add a queue to NestJS 10?

**Answer:**

Both are Redis-backed job queues with a Nest integration. Bull, through `@nestjs/bull`, is the older library and is in maintenance. BullMQ, through `@nestjs/bullmq`, is the one to choose for a new Nest 10 app. The idea is the same: a producer adds a job, a processor runs it. The APIs differ. BullMQ’s Nest processor extends `WorkerHost` and implements `process(job)`. Bull uses `@Process()` methods instead. Do not mix the two packages on one queue.

**Follow-up:**

What do `forRoot` and `registerQueue` each do?

Answer: `forRoot` sets the shared Redis connection. `registerQueue` declares one named queue so a producer can inject it and a processor can listen to it.

### NEST-303 — What happens when a producer adds a job

**Difficulty:** Intermediate

**Category:** Queues

**Question:**

What does `queue.add` actually do in a Nest BullMQ producer, and what does the HTTP handler learn from it?

**Answer:**

You inject the queue with `@InjectQueue('email')` and call `add(name, data, options)`. The name picks the kind of work, the data is the payload, and the options cover attempts, delay, and a job id. `add` resolves when Redis has accepted the job, not when the worker finishes. The handler still does not know whether the email will send. If Redis is down, `add` fails and the request should fail too, because the work was not safely stored.

**Follow-up:**

How small should the payload be?

Answer: Store an id and the job name, then let the worker load current state. A full entity copy goes stale, bloats Redis, and may leave personal data sitting in the queue.

### NEST-304 — What a processor does and how concurrency works

**Difficulty:** Intermediate

**Category:** Background jobs

**Question:**

What does a BullMQ processor in Nest actually run, and what does concurrency change?

**Answer:**

A processor is the class that pulls jobs for one queue. With `@nestjs/bullmq` you extend `WorkerHost` and implement `process(job)`. Every named job on that queue comes through this one method, so you branch on `job.name`. The older Bull package is different: each name can have its own `@Process()` method. Concurrency on `@Processor()` is how many jobs this worker runs at once. That helps input and output, such as HTTP calls. It does not add CPU, because those jobs still share one Node thread.

**Follow-up:**

Where should CPU-heavy work go?

Answer: Move it to a separate worker process or to worker threads. Raising concurrency on the API process still blocks the same event loop that serves HTTP.

### NEST-305 — Job states worth naming in an interview

**Difficulty:** Intermediate

**Category:** Queues

**Question:**

Which BullMQ job states should you be able to describe, and what does each one mean?

**Answer:**

A job starts waiting. A delayed job waits until its time, then becomes waiting. Active means a worker took it and holds a lock. Completed means `process` finished without throwing. Failed means the attempts are used up or the error cannot be retried. You can also pause a queue, which stops workers from taking new jobs. These states live in Redis, so another Nest process can see them. “Done” in your database is a separate fact you update yourself.

**Follow-up:**

What is a BullMQ flow?

Answer: A flow is a parent job that waits for child jobs, such as three image sizes and then one email. Each child retries on its own. It coordinates jobs, and it is not a database transaction.

### NEST-306 — Why the worker is often its own Nest process

**Difficulty:** Intermediate

**Category:** Background jobs

**Question:**

Why do teams run the BullMQ worker as a separate Nest process from the HTTP API?

**Answer:**

The default processor lives in the same process as the API, on the same event loop. A long or heavy job then slows requests. A separate worker app boots the same queue module without listening on the public port, so you can scale and deploy it on its own. An API rollout does not have to kill running jobs. You still point both apps at the same Redis and the same queue name. Keep the job handler idempotent, because a deploy can stop a worker mid-job and another worker may run it again.

**Follow-up:**

What must the worker do on shutdown?

Answer: Call `enableShutdownHooks()` so Nest can close the worker. Closing releases the job lock. If you skip that, the job sits active until the lock expires and looks stalled.

### NEST-307 — What Redis stores for BullMQ, and what it does not promise

**Difficulty:** Senior

**Category:** Queues

**Question:**

What is Redis responsible for in a BullMQ setup, and which failure still loses jobs?

**Answer:**

BullMQ keeps payloads, wait lists, locks, and retry state in Redis. The Nest process can die, and another worker can continue, because the queue is not in memory. Redis is not an infinite archive. Flushing a database, losing a primary with no replica, or turning on eviction under memory pressure can delete job keys. Use a Redis dedicated to queues, with eviction off, and persistence that matches how much in-flight work you can afford to lose. The business record still belongs in your main database. The queue is only the in-flight copy.

**Follow-up:**

How is this different from Nest’s Redis microservice transporter?

Answer: BullMQ uses Redis as a data store for job lists. The Redis transporter uses pub/sub to pass messages and does not keep them. Same product, different use, and one does not replace the other.

### NEST-308 — Delayed jobs versus repeatable jobs

**Difficulty:** Intermediate

**Category:** Background jobs

**Question:**

When would you use a delayed BullMQ job, and when would you use a repeatable job?

**Answer:**

A delayed job is one unit of work that should run later. `delay` is a number of milliseconds from now, such as “send this reminder in an hour.” A repeatable job is a schedule stored in Redis, often with a cron pattern, that keeps adding a new job on each tick. Workers sharing that queue do not each fire their own copy, because Redis holds the schedule. That is the main reason to prefer it over an in-process timer. You still need a worker running when the tick happens, or the job waits until one is up.

**Follow-up:**

What if you remove a repeatable job the wrong way?

Answer: Deleting one queued copy does not remove the schedule. Remove the repeatable registration itself, or the next tick will add the job again.

### NEST-309 — Using a job id so the same work is not queued twice

**Difficulty:** Intermediate

**Category:** Queues

**Question:**

How does a BullMQ job id help when a client retries a request that enqueues work?

**Answer:**

Pass a stable `jobId`, such as the payment id or an idempotency key from the client. If a job with that id is still in Redis, a second `add` does not create a second job. That covers the user double-clicking, or the HTTP client retrying after a timeout where the first `add` actually succeeded. The protection lasts only while Redis still holds the job. If you remove completed jobs immediately, the same id can be added again later. Keep completed ids for as long as retries are still possible.

**Follow-up:**

Does a job id make the worker safe to run twice?

Answer: No. The id only dedupes adds, and a stalled job can still execute twice. The worker has to tolerate a repeat, usually with a unique constraint or a status check.

### NEST-310 — Attempts and backoff

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

How should you configure BullMQ attempts and backoff for a job that calls another service?

**Answer:**

A job is not retried unless you set `attempts`. Set it to the total number of tries you are willing to pay for, including the first run. Without backoff, the retries happen immediately and you hammer the same outage. Use `backoff: { type: 'exponential', delay: 1000 }` so the waits grow, or `fixed` when you want a steady gap. Add jitter if many jobs fail together, or they all wake up at once and recreate the outage. Retries help transient errors. They do not fix a bad payload.

**Follow-up:**

What do you lose if attempts is very high?

Answer: A broken dependency keeps a worker busy for a long time, and the queue grows behind it. Cap the tries, then park the job and alert someone.

### NEST-311 — Which errors deserve a retry

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

How do you decide that a failed Nest job should retry, and how do you stop retries in BullMQ?

**Answer:**

Retry when the next try might work: a timeout, a 503, a dropped connection, a deadlock. Do not retry when the input is wrong, the user no longer exists, or a bug throws on every run. Those will fail the same way until attempts run out, and they block a worker each time. In BullMQ, throw `UnrecoverableError` for the permanent cases. The job goes to failed immediately, and the remaining attempts are skipped. Log the reason. A generic `Error` is treated as retryable if attempts remain.

**Follow-up:**

Where should that decision live?

Answer: In the processor, close to the call that failed. A global “retry everything” policy looks simple and then retries validation bugs for hours.

### NEST-312 — Poison messages

**Difficulty:** Senior

**Category:** Poison messages

**Question:**

What is a poison message, and how should a Nest consumer stop it from blocking everyone else?

**Answer:**

A poison message is one that fails every time it is handled, usually because the payload is bad or the code has a bug. If you retry it forever, a Kafka partition can sit on that record and stop later messages, or a queue worker can burn its attempts on the same job. After a small limit, copy it somewhere safe: a BullMQ failed set you alert on, or a dead-letter topic. Only then acknowledge the original. Quarantine it, fix the cause, and replay on purpose. Dropping it to “keep the line moving” loses the business event.

**Follow-up:**

What should you page a human for?

Answer: Page when the dead-letter count rises, not on a single retry. One timeout is normal. A growing quarantine means a bad deploy or a producer bug.

### NEST-313 — Stalled jobs

**Difficulty:** Senior

**Category:** Retries

**Question:**

What does BullMQ mean by a stalled job, and why can that run your handler twice?

**Answer:**

When a worker takes a job it holds a lock and renews it while the process is alive. If the process crashes, or the event loop is blocked so renewal cannot run, the lock expires. BullMQ treats the job as stalled and can return it to waiting for another worker. That is how work survives a crash. It also means `process` may already have charged a card or sent mail. After too many stalls the job fails instead of looping forever. Treat a stalled retry as normal, and make the handler safe to run twice.

**Follow-up:**

How do you avoid false stalls on a long job?

Answer: Keep the lock longer than a normal run, and do not block the event loop so renewal can happen. If the work is naturally slow, checkpoint progress and make each step idempotent.

### NEST-314 — Why queue concurrency breaks ordering

**Difficulty:** Senior

**Category:** Ordering

**Question:**

Why is “the queue is FIFO” not enough once a Nest BullMQ worker runs more than one job at a time?

**Answer:**

A single worker with concurrency 1 takes jobs in queue order and finishes them in that order. As soon as several jobs run at once, a later short job can finish before an earlier slow one. Retries make this worse: a failed job goes to the back, or waits on backoff, while newer jobs pass it. Delays and priorities reorder work on purpose. If two events for the same order must happen in sequence, do not rely on global queue order. Serialize work for that id, or use a system that orders by key. Parallelism across unrelated ids is fine.

**Follow-up:**

Does priority restore correctness?

Answer: No. Priority only changes who runs first. It does not wait for an earlier job on the same entity to finish, and retries still jump the line.

### NEST-315 — Where Kafka keeps order

**Difficulty:** Senior

**Category:** Ordering

**Question:**

In what sense does Kafka preserve order for a Nest consumer, and where does that promise stop?

**Answer:**

Kafka orders records inside one partition. It does not order records across partitions. A Nest app in a consumer group is assigned partitions, and those partitions move forward independently. If you produce events for one order onto different partitions, the consumer can see “shipped” before “paid.” The key you produce with decides the partition. Same key, same partition, same order, as long as one consumer handles that partition without overlapping those records. Adding partitions later changes key placement, so order guarantees are about how you key and how you consume, not about the topic as a whole.

**Follow-up:**

What happens to order during a rebalance?

Answer: A rebalance can pause the partition and hand it to another instance. Records stay in partition order, but in-flight work on the old instance must still be idempotent.

### NEST-316 — Keeping related messages in order on purpose

**Difficulty:** Senior

**Category:** Ordering

**Question:**

How do you design Nest producers and consumers so events for one entity stay in order?

**Answer:**

Give every event for that entity the same ordering key. On Kafka, that key is the partition key, such as the order id, rather than a random id. On a queue, one queue per entity only works at small volume, because you lose parallelism. Inside the consumer, do not fan out events for the same id with `Promise.all`. Parallelize across different ids. If a step fails, retry that entity’s stream without skipping ahead. Order you only saw in a quiet test will disappear under load.

**Follow-up:**

What is a cheap way to serialize one id on a queue?

Answer: A lock or a Redis list per id works at modest volume. At high volume, a partitioned log with the entity id as the key is the usual answer.

### NEST-317 — What a Nest microservice transporter is

**Difficulty:** Junior

**Category:** Transporters

**Question:**

What is a transporter in NestJS microservices, at the level you would explain to another engineer?

**Answer:**

A transporter is how one Nest process talks to another when you use `@nestjs/microservices`. You choose it when you create the microservice or connect a client: TCP, Redis, NATS, Kafka, and others. Your handlers still look like Nest methods. `@MessagePattern` answers a call, and `@EventPattern` reacts to an event. The transporter moves the bytes and, depending on which one you picked, may or may not store them. It does not give you a domain model, retries, or exactly-once side effects. Those stay in your code.

**Follow-up:**

Is this the same thing as putting Nginx in front of HTTP?

Answer: No. Normal Nest HTTP controllers already speak HTTP. A transporter is for the microservice client and server APIs, with their own patterns, payloads, and failure behavior.

### NEST-318 — When TCP is the right transporter

**Difficulty:** Intermediate

**Category:** Transporters

**Question:**

When is Nest’s TCP transporter a good choice, and when is it a poor one?

**Answer:**

TCP is a reasonable default for a few internal services on a private network that call each other and need a reply. There is no broker to run. Latency is low, and `ClientProxy.send` fits request-response. You configure a host and port, so you are pointing at an address, not at a durable log. If that process is down, the message is not waiting for it later. It is a poor fit for public clients, for many independent subscribers, and for anything you cannot afford to lose. Put a real broker in front of those cases.

**Follow-up:**

How do you reach more than one TCP instance?

Answer: Nest’s client is aimed at the address you set. You need a load balancer or your own discovery in front. The transporter itself does not fan a message out to every replica.

### NEST-319 — When the Redis transporter is enough

**Difficulty:** Intermediate

**Category:** Transporters

**Question:**

When is the Redis microservice transporter enough, and what will it silently drop?

**Answer:**

Use it when you already run Redis and you want lightweight messages between Nest services, such as “this cache entry is stale.” Pub/sub delivers to whoever is subscribed at that moment. If nobody is listening, the message is gone. There is no replay and no consumer lag to inspect later. That is fine for signals you can miss and recompute. It is the wrong place for payments, orders, or any event you must recover after a deploy. Do not confuse it with BullMQ. BullMQ stores jobs. This transporter only publishes.

**Follow-up:**

Can two Nest instances both receive the same Redis event?

Answer: Yes. Pub/sub gives every subscriber a copy, so both instances can charge the card. The handler has to be idempotent, or only one of them should act.

### NEST-320 — When to pick NATS

**Difficulty:** Intermediate

**Category:** Transporters

**Question:**

When would you choose NATS as the Nest transporter instead of TCP, Redis, or Kafka?

**Answer:**

Pick NATS when many internal services need low-latency messages and a simple request-reply style, and you want a small broker rather than point-to-point hosts. Core NATS, which is what people usually mean with Nest’s built-in transporter, is fast and does not keep a durable log. If no one is there to take the message, you do not get Kafka-style replay. A NATS queue group load-balances: one member handles each message. Services that must each see a copy cannot share that group. If the business needs retention and replay, say so and use JetStream or Kafka on purpose.

**Follow-up:**

What should you check in the Nest NATS options?

Answer: Check the `queue` option, which names the NATS queue group. Sharing it means competing consumers, so one pod handles each message. Separate groups when every pod must see the event.

### NEST-321 — When to pick Kafka

**Difficulty:** Intermediate

**Category:** Transporters

**Question:**

When is Kafka the right Nest transporter, even though it is heavier to run?

**Answer:**

Choose Kafka when the message is a fact you may need again: several teams consume it, a new service should read history, or you need order for one key. The topic retains records for a configured time, and a consumer group tracks how far it got. Nest’s Kafka transport fits `@EventPattern` well. Request-response is possible and usually awkward, because Kafka is a log, not an RPC product. You pay for brokers, partitions, and lag monitoring. Use it for the streams that justify that cost, not for every internal function call. A quiet TCP call is still fine beside it.

**Follow-up:**

What do you watch in production?

Answer: Consumer lag. A growing lag means handlers are slower than producers, a consumer is stuck, or a poison record is holding a partition. The HTTP health of the Nest process will not show that.

### NEST-322 — One process for HTTP and a microservice

**Difficulty:** Senior

**Category:** Transporters

**Question:**

What is a hybrid Nest app, and when does that deployment start to hurt?

**Answer:**

A hybrid app calls `NestFactory.create` for HTTP, then `connectMicroservice` for a transporter, then `startAllMicroservices` before `listen`. One process serves the API and consumes messages. That is convenient for a small service. It hurts when the two workloads want different scale. A burst of Kafka messages competes with user requests on one event loop. You also cannot roll the consumer without touching the API. Split them when the loads differ, when a consumer bug should not take down the API, or when you need a different replica count. Share the code through a library.

**Follow-up:**

What has to be started, or the patterns never run?

Answer: `startAllMicroservices()` must be awaited before you serve traffic. Connecting the microservice and only calling `listen` leaves the consumer unstarted.

### NEST-323 — Request-response with send and MessagePattern

**Difficulty:** Intermediate

**Category:** Messaging patterns

**Question:**

How does Nest request-response messaging work, from the caller to the handler?

**Answer:**

The caller uses `client.send(pattern, payload)`. That returns an Observable and waits for one reply. The other service declares `@MessagePattern` with the same pattern and returns a value, which Nest sends back. Use this when the caller cannot continue without the result, such as a calculation or a lookup another service owns. The caller is coupled in time: if the handler is slow or dead, this call waits or fails. Set a timeout. Patterns must match exactly, including object shape. A string on one side and `{ cmd: 'sum' }` on the other will not meet.

**Follow-up:**

What does the caller see if the handler throws?

Answer: The Observable errors, and the caller should map that to a clear failure. It is not a silent empty result. If you never subscribe or convert to a promise, the call does not actually run.

### NEST-324 — Events with emit and EventPattern

**Difficulty:** Intermediate

**Category:** Messaging patterns

**Question:**

How do Nest events differ from request-response, and what does the producer learn?

**Answer:**

The producer calls `client.emit(pattern, payload)` and does not wait for a handler. The consumer uses `@EventPattern` with that pattern. This fits “an order was placed,” where other services may react and the API should not block on all of them. The producer does not learn whether anyone handled it. Delivery depends on the transporter. Kafka can retain the event. Redis pub/sub will not. Emit is the wrong tool when you need the answer in this request. It is also the wrong tool if a lost message would corrupt the business state, unless a stored log sits underneath.

**Follow-up:**

Can a handler reply to an event?

Answer: There is nothing waiting for a reply. Return values are ignored. If you need a result, use `send` and `@MessagePattern`, or write the result somewhere the caller can read later.

### NEST-325 — Two instances: a copy each, or shared work

**Difficulty:** Senior

**Category:** Messaging patterns

**Question:**

If you run two copies of a Nest consumer, which transporters give both a copy of each message, and which make them share the work?

**Answer:**

Redis pub/sub gives every subscriber a copy. If both pods send the welcome email, you send it twice. Kafka does the opposite inside one consumer group: partitions are split, so each record is handled by one member. A second group gets its own copy, which is what you want for a separate service. NATS depends on the queue group. Members of the same group share messages. TCP does not broadcast. It calls the address you configured. Decide this before you scale. “It worked with one pod” hides whether you are duplicating side effects or dropping subscribers.

**Follow-up:**

How should two replicas of the same email consumer be set up on Kafka?

Answer: Give them the same `groupId` so only one sends each message. A new service that also needs the event gets a different group id and its own copy.

### NEST-326 — Timeouts on a request-response call

**Difficulty:** Intermediate

**Category:** Messaging patterns

**Question:**

What goes wrong if a Nest `send()` call has no timeout, and how do you bound it?

**Answer:**

`send()` waits for a reply that may never come. The handler can be stuck, the process can be gone, or the pattern can be wrong. Without a timeout, that Observable hangs and the caller holds resources. Pipe RxJS `timeout`, or the equivalent in your client wrapper, and treat expiry as a failure the user can see. The timeout does not cancel the remote work. The handler may still finish and reply to nobody. So a timed-out “charge the card” call might have charged it. The caller should retry only with an idempotency key, not with a blind second charge.

**Follow-up:**

Where should the timeout live?

Answer: In the client wrapper you inject, so every caller gets the same limit. A timeout buried in one controller will be forgotten on the next call site.

### NEST-327 — What the CQRS module gives you

**Difficulty:** Intermediate

**Category:** CQRS

**Question:**

What does `@nestjs/cqrs` actually provide, without turning it into a distributed system?

**Answer:**

It gives you in-process buses and handler classes. A command goes through `CommandBus` to a `@CommandHandler`. A query goes through `QueryBus` to a `@QueryHandler`. An event goes through `EventBus` to `@EventsHandler` methods. There is also a saga helper that listens to those events. This organizes write and read code when they want to diverge. It does not persist events, cross the network, or retry a handler. A command dispatch is a method call inside this Nest process. You can still use one database and simple services behind those handlers.

**Follow-up:**

Does the module stop a query from writing?

Answer: No. The split is a convention you keep in review. A query handler can still update rows, and the framework will not reject it.

### NEST-328 — Command, query, and event

**Difficulty:** Intermediate

**Category:** CQRS

**Question:**

How should you explain command, query, and event when using Nest’s CQRS module?

**Answer:**

A command asks the system to change something: place an order, cancel a seat. It is a request, and it can be refused. A query asks for information and should not change state: show the order, list open seats. An event says a change already happened: the order was placed. Handlers react to it. In the module these are three classes of message on three buses, matched by type. The useful part is the direction of the words. People mix them by publishing “PlaceOrder” as an event before the write succeeds. By then listeners think the fact is real.

**Follow-up:**

What should a command return?

Answer: As little as the caller needs, often an id or a simple result. Returning the whole read model from the command handler tends to glue the write path and the view back together.

### NEST-329 — The CQRS event bus stays in the process

**Difficulty:** Senior

**Category:** CQRS

**Question:**

You publish a CQRS event and another Nest pod never reacts. Why?

**Answer:**

`EventBus` delivers to handlers in this process only. A second pod, and a second service, are not subscribed to that memory. `@nestjs/event-emitter` is the same kind of local hook. If another service must react, the handler or an outbox publisher has to send the fact through a transporter or a queue. `AggregateRoot` follows the same rule: `apply` records events and `commit` publishes them on the local bus. That is useful structure inside one write model. It is not a message broker. Teams hit this when a handler works in dev with one process and goes quiet once two replicas run.

**Follow-up:**

Should every command also be a Kafka message?

Answer: No. Keep local commands local. Publish a durable event only when another process has a real reason to hear about the outcome.

### NEST-330 — When CQRS is unnecessary

**Difficulty:** Intermediate

**Category:** CQRS

**Question:**

When is adding `@nestjs/cqrs` the wrong simplification for a Nest service?

**Answer:**

Skip it when one service method can read and write a single model clearly. A CRUD screen does not become easier as a command class, a handler, a query class, and an event. You add files and an in-process bus without a second read model or a real domain split. Use the module when write rules are rich, when the view is shaped differently from the tables, or when several handlers must react to one local outcome. Starting with the buses on day one often hides a simple flow behind indirection.

**Follow-up:**

What is a smaller first step?

Answer: A plain service method with a clear name. If the same outcome later needs extra reactions, introduce an event then, and only across a process boundary if another app must see it.

### NEST-331 — Choreography versus orchestration

**Difficulty:** Senior

**Category:** Saga

**Question:**

How do you explain saga choreography versus orchestration for work that spans Nest services?

**Answer:**

Choreography means there is no central owner of the flow. The order service publishes that an order was placed. Payment hears it and publishes that payment was taken. Inventory hears that and reserves stock. Each team owns its reaction. The hard part is seeing the whole path and noticing a step never happened. Orchestration means one process walks the steps: call payment, then inventory, and decide what to undo. The path is easier to read and to time out. The coordinator can fail, and other teams wait on it. The choice is who is allowed to know the whole story.

**Follow-up:**

Which failure is quieter?

Answer: Choreography. A missed event looks like nothing happened. An orchestrator can record “stuck on payment” in one row you can query.

### NEST-332 — What a Nest @Saga method does

**Difficulty:** Senior

**Category:** Saga

**Question:**

What does a `@Saga()` method in `@nestjs/cqrs` do when an event comes in?

**Answer:**

It is a function from the local event stream to a stream of commands. You filter with `ofType`, map an event to a command, and the module dispatches that command on the command bus. A typical use is “when this in-process event happens, start the next local command.” It is choreography glue inside one application, written with RxJS. It does not call other microservices, store its place, or know about Kafka. If the next step is remote, the command handler you return should make that call, with the same timeouts and idempotency as any other client.

**Follow-up:**

What happens to the Observable if you forget to return a command stream?

Answer: The saga does not dispatch anything. Mapping to an event instead of a command also fails the idea. The bus expects commands back.

### NEST-333 — Compensation is not a database rollback

**Difficulty:** Senior

**Category:** Saga

**Question:**

Why can’t a Nest saga undo a failed multi-service flow with one database rollback?

**Answer:**

A rollback undoes work that has not committed, in one database, in one transaction. In a saga, payment may already have committed in its own database before inventory fails. That money movement is real. The recovery is a new action, called compensation: refund the payment, release the seat, mark the order cancelled. Those actions can fail too, so they need retries and their own idempotency keys. Design every step as something you can safely repeat and something you can undo with a forward action. “Delete the row and hope” is not compensation once another service has told the user yes.

**Follow-up:**

What if a step cannot be undone?

Answer: Make it the last step, or make it tentative until the saga finishes. Sending a public notification in the middle is painful because you cannot unsend it. You can only send a correction.

### NEST-334 — Why an in-memory saga is a poor long-running process

**Difficulty:** Staff

**Category:** Saga

**Question:**

A checkout saga waits hours for a payment provider. Why is Nest’s in-memory `@Saga()` a poor place to keep that wait?

**Answer:**

The `@Saga()` subscription lives in the Node process. It is an RxJS pipeline, not a stored state machine. A deploy, a crash, or a second replica means that pipeline is gone, or it is not the replica that receives the next event. Hours-long work needs a row: which order, which step, when it times out, and what to run next. A worker loads that row and continues. `@Saga()` is still fine as glue that turns a local event into a command immediately. When the wait outlives one process, store the saga and put the timeout in that row.

**Follow-up:**

What is the smallest durable design?

Answer: One table keyed by the business id, a status column, and a worker that polls due rows. Move to a workflow engine only when the steps and compensations outgrow that table.

### NEST-335 — The dual-write problem the outbox solves

**Difficulty:** Senior

**Category:** Outbox

**Question:**

What is the dual-write problem when a Nest service saves an order and publishes an event?

**Answer:**

You need two effects: a committed row, and a message other services can trust. They are not one transaction. If you commit and the process dies before publish, the order exists and nobody else hears about it. If you publish and the commit then fails, other services react to an order that never landed. The transactional outbox writes the message in the same database transaction as the order. A later publisher reads that table and sends what actually committed. You may still publish twice. What you gain is that the published message matches a row that committed.

**Follow-up:**

Why not a distributed transaction across Postgres and Kafka?

Answer: Nest and the usual drivers do not enroll Kafka and Postgres in one two-phase commit, and that coupling is brittle. The outbox keeps one local transaction and moves the rest to retries and idempotent consumers.

### NEST-336 — Building an outbox from Nest

**Difficulty:** Senior

**Category:** Outbox

**Question:**

How do you implement an outbox in a Nest app that has no built-in outbox module?

**Answer:**

In the same transaction as the business write, insert an outbox row: id, type, payload, and a null published time. A publisher, as a scheduled worker or a BullMQ job, reads unpublished rows in order. If several instances poll, lock rows with `FOR UPDATE SKIP LOCKED` so they do not grab the same ones. Publish to the broker, and set the published time only after the broker accepts the message. A crash between those steps sends a duplicate later, which is fine when consumers are idempotent. Mark the row published only after a successful send.

**Follow-up:**

What should the payload contain?

Answer: The fact consumers need, plus a stable message id. Prefer ids and the new state over a giant object graph that goes stale before the publisher runs.

### NEST-337 — What an idempotent consumer checks

**Difficulty:** Senior

**Category:** Idempotency

**Question:**

How does a Nest consumer behave when the same message arrives twice?

**Answer:**

At-least-once delivery means a duplicate is normal: a publisher retry, a stalled job, or a crash after the side effect and before the ack. The handler should end in the same business state. The reliable check is a unique constraint, often an inbox row with the message id, written in the same database transaction as the side effect. If the insert conflicts, this copy was already applied, so acknowledge it and return. A read-then-write check without a constraint lets two workers both pass the read. Setting a status to paid when it is already paid is the same idea.

**Follow-up:**

Where does the message id come from?

Answer: From the producer, and it must be stable across retries. A fresh uuid generated inside the consumer makes every duplicate look new.

### NEST-338 — At-least-once plus idempotency

**Difficulty:** Staff

**Category:** Idempotency

**Question:**

Why do senior Nest teams aim for at-least-once delivery plus an idempotent consumer, instead of exactly-once?

**Answer:**

Exactly-once would mean the real effect happens one time across crashes: one charge, one email, one row. A broker can dedupe its own log, but the effect usually sits outside that log, in Postgres, a payment API, or a mail provider. Those systems do not share one atomic commit with the message ack. If you ack first, you can lose the message. If you ack after the effect and crash before the ack, the next delivery repeats it. The workable contract is at-least-once transport plus a handler that makes a repeat a no-op.

**Follow-up:**

When is at-most-once acceptable?

Answer: When dropping a message is cheap and repeating it is not, such as a live metrics ping. Do not use it for money or for state the user was promised.

### NEST-339 — What a WebSocket gateway is

**Difficulty:** Junior

**Category:** WebSockets

**Question:**

What is a Nest WebSocket gateway, and how does a client message reach your code?

**Answer:**

A gateway is a class marked with `@WebSocketGateway`. Nest treats it as a provider, so you can inject the same services as a controller. The usual adapter is Socket.IO. `@SubscribeMessage('chat')` runs when a client emits that event. `@WebSocketServer()` gives you the server so you can push to one socket, a room, or everyone. You also get connection and disconnect hooks to track who is present. The gateway is two-way and stays open. It is not a queue and it does not replace HTTP for ordinary reads. Anything you keep only in a local map of sockets belongs to this process.

**Follow-up:**

How do you avoid putting business rules in the gateway?

Answer: Validate the payload, then call a service. The gateway should own connection concerns. Pricing, permissions, and database writes stay in the same services HTTP already uses.

### NEST-340 — Sticky sessions and the Redis adapter

**Difficulty:** Senior

**Category:** WebSockets

**Question:**

You run more than one Nest instance with Socket.IO. What do sticky sessions solve, and what do you still need a Redis adapter for?

**Answer:**

Socket.IO starts with HTTP long-polling, then upgrades. Those polling requests must hit the same pod, or the session breaks. Sticky sessions on the load balancer pin a client to one instance with a cookie. That does not share sockets across pods. If an order completes on pod A and the user’s socket is on pod B, a local `emit` never reaches them. The Redis adapter publishes those emits so every instance can deliver to its own sockets. You usually want both: sticky sessions for the connection, and the adapter for fan-out. Stickiness alone fails when another instance creates the message.

**Follow-up:**

Do sticky sessions fix `@Cron` as well?

Answer: No. Stickiness only pins browser connections. Every pod still runs its own process, including its own scheduled jobs.

### NEST-341 — Server-sent events versus WebSockets

**Difficulty:** Intermediate

**Category:** SSE

**Question:**

When should a Nest API use server-sent events instead of a WebSocket gateway?

**Answer:**

Use server-sent events when the server pushes and the client does not need to send on that same connection. A job progress stream or a notification feed fits. In Nest, `@Sse()` returns an Observable of message events, and the response is `text/event-stream`. It stays on HTTP, so existing auth middleware, proxies, and access logs are easier to reuse. Prefer WebSockets when the client also sends frequently, or you want rooms and binary frames. SSE is still one long request per client. Proxies may close idle streams, so the client should reconnect. A smaller-looking API does not make the connection cheaper.

**Follow-up:**

Why is browser auth on `EventSource` awkward?

Answer: The native `EventSource` API cannot set an `Authorization` header. Teams use a cookie session or a short-lived token in the query string, with the usual care about logs and leaks.

### NEST-342 — SSE with more than one Nest instance

**Difficulty:** Senior

**Category:** SSE

**Question:**

A client’s event stream is connected to pod A, and the domain event is handled on pod B. How does the event reach the browser?

**Answer:**

The SSE connection is only a list of local subscribers on the pod that accepted the HTTP request. Pod B cannot write to that socket. Publish the fact through Redis pub/sub. Every pod listens, and the pod that holds the client writes a message event. Unsubscribe when the request closes, or the pod keeps a dead client and leaks memory. If the browser must not miss events across a reconnect, send an id and honor `Last-Event-ID` from a store you can read again. A Redis pub/sub message can still be missed while a pod is restarting.

**Follow-up:**

What breaks if the Observable never tears down?

Answer: Each disconnect leaves a handler in the local set. Under a rolling deploy or flaky mobile networks, that set grows until the process spends its time writing to dead responses.

### NEST-343 — What @Cron does inside one process

**Difficulty:** Junior

**Category:** Scheduling

**Question:**

How does `@Cron` in `@nestjs/schedule` run a task in a NestJS 10 app?

**Answer:**

You import `ScheduleModule.forRoot()`, then put `@Cron` on a provider method with a cron expression or a `CronExpression` constant. When the process clock matches, Nest calls that method. `@Interval` and `@Timeout` cover simpler timers. The scheduler lives in this process. It does not know about other pods, and it does not persist a run history. If the process is down at the tick, that tick is skipped. Dynamic jobs go through `SchedulerRegistry` when the schedule is not known at compile time. The method should call a service, stay idempotent, and hand heavy work to a queue.

**Follow-up:**

Why might a cron fire late?

Answer: Node runs it on the event loop. If the loop is blocked, the callback waits. The decorator does not use a separate clock process, and it does not catch up every missed tick after a blockage.

### NEST-344 — Why every replica fires the same cron

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

You deploy three Nest replicas and a nightly `@Cron` sends the same invoices three times. Why, and what are sound fixes?

**Answer:**

Each replica loads `ScheduleModule` and runs the schedule on its own clock. Nothing in `@nestjs/schedule` elects a leader. Sticky sessions do not help, because there is no client connection to pin. Three fixes work. Run the scheduler as a single deployment, not on every API pod. Take a distributed lock, in Redis or with a Postgres advisory lock, and skip the run when you do not get it. Or use a BullMQ repeatable job so Redis adds one job per tick and one worker runs it. Keep the handler idempotent in case a lock expires and a second runner starts.

**Follow-up:**

What if two pods have clocks a minute apart?

Answer: Both can believe they own “midnight.” A lock with a clear expiry, or a BullMQ schedule stored in one place, is stronger than hoping the clocks match.

### NEST-345 — Liveness versus readiness when dependencies fail

**Difficulty:** Senior

**Category:** Health

**Question:**

How should Nest health checks behave when Postgres or another service is down?

**Answer:**

Liveness answers “should the orchestrator restart this process?” Readiness answers “should the load balancer send traffic?” If the process is up and the event loop is fine, liveness should pass even when Postgres is down. Restarting every pod will not bring Postgres back, and a crash loop makes the outage worse. Readiness should fail when this instance cannot do its job, so traffic moves away or stops. `@nestjs/terminus` is the usual way to compose those checks. Each service reports its own view. A pretty dashboard that calls every neighbor is not the probe Kubernetes should use to kill pods.

**Follow-up:**

What belongs in liveness at all?

Answer: Only failures a restart can fix, such as a wedged process. A failed disk you cannot repair by restarting does not belong there either. Keep the probe cheap and local.

### NEST-346 — Checking another service without coupling restarts

**Difficulty:** Intermediate

**Category:** Health

**Question:**

How do you include a downstream Nest service in health without turning its outage into your restart storm?

**Answer:**

Put the downstream ping on readiness or a dependency endpoint, not on liveness. Terminus can call HTTP with `HttpHealthIndicator`, or ping a microservice transport with `MicroserviceHealthIndicator`, always with a short timeout. Cache the result for a few seconds so probes do not become a load test. If the dependency is optional, report it as degraded and keep serving paths that do not need it. If every request needs it, fail readiness so this pod stops taking traffic. Agree on what healthy means. A 200 from a process that cannot reach its database hides the outage behind a green check.

**Follow-up:**

Should the API gateway mark itself down when one backend is down?

Answer: Only for the routes that need that backend. Taking the whole gateway out because search is degraded also takes down checkout. Per-route behavior is the product decision.

### NEST-347 — Where distributed tracing hooks belong

**Difficulty:** Senior

**Category:** Tracing

**Question:**

NestJS 10 has no tracing module in core. Where do you hook distributed tracing?

**Answer:**

Use OpenTelemetry. Auto-instrument inbound HTTP so a request starts a span without a wrapper on every controller. Add a thin interceptor only for attributes you will search, such as the route template and a tenant id, not the whole body. On the way out, propagate the W3C `traceparent` header on HTTP calls and on broker messages. Export spans to a collector over OTLP. A trace that starts fresh in every service is a set of unrelated timers. Flush spans on shutdown, and keep personal data out of span attributes.

**Follow-up:**

Why not log the trace and skip propagating headers?

Answer: Logs on one service will not line up with the database call or the next service. Propagation is what makes one trace. A trace id in the log is how a human jumps from a line to that trace.

### NEST-348 — Carrying a trace into a BullMQ job

**Difficulty:** Senior

**Category:** Tracing

**Question:**

How do you connect the span of an HTTP request with the span of the BullMQ job it enqueued?

**Answer:**

When you call `queue.add`, copy the current trace context into the job, usually as a `traceparent` value in the data or in job metadata. In `process()`, extract that context and start the worker span as its child. The trace then shows the request, the wait in Redis, and the handler. A new root span in the worker shows up as a second trace you must join by job id. Pass the same context onward if the job calls another service. Do not put the full payload on the span. The job id and the job name are enough to debug.

**Follow-up:**

What do you lose if you only store the job id on the request span?

Answer: You can still find the logs, but you lose timing and parent-child structure across the queue. A long wait in Redis looks like a mystery gap instead of its own span.

### NEST-349 — Circuit breaking at the application layer

**Difficulty:** Senior

**Category:** Resilience

**Question:**

How do you add a circuit breaker around outbound calls from Nest, and what should it ignore?

**Answer:**

Put the breaker in the provider that calls the other system, not in a global guard. A small library such as cockatiel or opossum is enough. While the circuit is closed, calls go through. After enough failures or timeouts, it opens and fails fast for a cool-down. Half-open allows a trial call and closes again if that call succeeds. Always set a timeout, or slow calls never count and the breaker never opens. Do not trip on a 400, which is a bad request. The fallback is a product choice: a cached value, a 503, or a skipped optional feature.

**Follow-up:**

When is an app-level breaker the wrong tool?

Answer: When the dependency is required for every request and a restart or a readiness failure is the honest response, such as your primary database. Failing fast still needs a behavior the user can understand.

### NEST-350 — What else breaks with more than one Nest instance

**Difficulty:** Staff

**Category:** Deployment

**Question:**

Beyond sticky sessions and cron, what stops working correctly when a NestJS 10 service scales from one instance to several?

**Answer:**

Pods do not share memory. The CQRS event bus, `@nestjs/event-emitter`, an in-memory cache, a local map of WebSocket or SSE clients, and local files all stay on one instance. HTTP handlers should be stateless: a JWT or a session in Redis. Socket.IO needs sticky sessions and a Redis adapter. Schedules need a lock or a BullMQ repeatable job. Turn on shutdown hooks so a leaving pod closes its worker and its consumer group. A rolling deploy can rebalance Kafka and pause a partition. That pause loses data only if handlers or offsets are wrong. Config has to match across pods.

**Follow-up:**

What is safe to keep in memory?

Answer: Immutable local caches that can be wrong for a short time, such as a parsed public config with a TTL. Anything a user just wrote, and expects another request to see, belongs in a shared store.
