# 06. SNS vs SQS (a very common paired interview question)

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

| | SNS | SQS |
|---|---|---|
| Pattern | Pub/sub (fan-out to many subscribers) | Point-to-point queue (one message consumed once by one worker, typically) |
| Delivery | Pushed to subscribers | Pulled by consumers (polling) |
| Multiple consumers of the same message | Yes, natively (one message to N subscribers) | Not directly - each message is normally consumed once; fan-out to multiple SQS queues is achieved by subscribing multiple SQS queues to one SNS topic |
| Typical use | "Notify everyone interested that X happened" | "Reliably process each job exactly once, with retry/backoff, at your consumer's own pace" |

**A very common, well-regarded real pattern:** combine both - publish to an SNS topic, and have multiple SQS queues subscribed to that topic, one per consumer service. This gives you fan-out (SNS) plus durable, retryable, independently-paced processing per consumer (SQS) - each consumer gets its own queue and can process at its own speed without messages being lost if that consumer is temporarily down, since SQS retains messages until they're processed or expire.

### Model spoken answer

"SNS and SQS solve different problems. SNS is push-based pub/sub - great for broadcasting one event to many independent subscribers. SQS is a durable point-to-point queue - great for reliable, retryable processing of individual jobs by a worker at its own pace. A common pattern is to combine them: publish once to an SNS topic, with multiple SQS queues subscribed underneath it, so you get fan-out to multiple consumers while each consumer also gets the durability and retry semantics of a queue, instead of losing a notification if it was down when SNS tried to push it directly."

---
