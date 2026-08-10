# 05. SNS: pub/sub and fan-out

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

### Topics to learn
- [ ] SNS = Simple Notification Service, a pub/sub messaging service
- [ ] Topic = a named channel that publishers send messages to
- [ ] Subscription = an endpoint (email, SMS, HTTP(S) webhook, SQS queue, Lambda function, mobile push) that receives messages published to a topic
- [ ] Fan-out pattern: one message published, delivered to many different subscribers simultaneously
- [ ] SNS is push-based and "fire and forget" from the publisher's perspective for most subscriber types

### Mental model

A publisher doesn't need to know who's listening - it just publishes a message to a topic. SNS then delivers a copy of that message to every current subscriber. This decouples the producer of an event from the consumers of that event, and lets you add new consumers later without changing the publisher at all.

### Example use case grounded in your domain

"A payment succeeds on VetApp/EasyPay-style backend. We want to: send a push notification to the user's phone, send a confirmation email, and update an internal analytics pipeline - all as a result of one event."

Without pub/sub, your payment-success code would need to directly call three different services (push, email, analytics), coupling payment logic to all of them and making it awkward to add a fourth consumer later.

With SNS:

```
Payment service --publishes--> SNS Topic: "payment.succeeded"
                                     |-- subscriber: Push notification Lambda
                                     |-- subscriber: Email service (via SQS queue)
                                     |-- subscriber: Analytics ingestion (via SQS queue)
```

The payment service publishes one message to the topic and moves on. Each subscriber independently receives and processes its own copy, and you can add a new subscriber (e.g. a fraud-detection service) without touching the payment code at all.

### Model spoken answer

"SNS is a pub/sub service - publishers send a message to a topic without knowing who's listening, and SNS fans it out to every subscriber, which could be an email endpoint, SMS, a mobile push endpoint, an SQS queue, or a Lambda function. I'd reach for it when one event needs to trigger multiple independent downstream actions - like a successful payment needing to trigger a push notification, an email receipt, and an analytics event - since it decouples the event producer from however many consumers exist, and lets you add new consumers later without touching the original code."

---
