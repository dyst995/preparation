# Creational Design Patterns — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What two guarantees does Singleton make? Why is a JavaScript module already a singleton without `getInstance()`?
- [ ] What is Nest’s default provider scope? When is Singleton OK, and when is it a lie?
- [ ] What does a factory keep the caller from doing? Name simple factory vs Factory Method vs Abstract Factory in one sentence each.
- [ ] Why is storing `currentUser` on a Nest singleton service wrong under concurrent requests?
- [ ] Builder vs a TypeScript options object vs TypeORM QueryBuilder vs `find()` — when each?
- [ ] `Object.create` vs object spread vs `structuredClone` — what does each actually produce?

## Predict / debug

State the result **and explain why**. For debug items, diagnose and fix.

- [ ] Two files import the same CJS module:

```js
// config.js
module.exports = { n: 0 };

// a.js loads first, then b.js
const config = require('./config');
config.n += 1;

// b.js
const config = require('./config');
console.log(config.n);
```

What does `b.js` log?

- [ ]

```ts
class MailBuilder {
  private draft: { to?: string } = {};
  to(email: string) { this.draft.to = email; return this; }
  build() { return this.draft; } // returns the same object
}
const b = new MailBuilder();
const mail = b.to('a@b.c').build();
b.to('other@x.y');
console.log(mail.to);
```

- [ ] Diagnose the production bug. Two overlapping HTTP requests hit this Nest service (default scope):

```ts
@Injectable()
export class AuthContext {
  userId: string | null = null;
}

@Injectable()
export class OrdersService {
  constructor(private auth: AuthContext) {}
  async place(userId: string) {
    this.auth.userId = userId;
    await chargeCustomer(this.auth.userId);
  }
}
```

## Say it out loud

- [ ] Explain Singleton in 30–60 seconds as if an interviewer asked.  
  **Follow-ups:** Is Nest’s default scope a singleton? Why is `currentUser` on a service dangerous?
- [ ] Explain Factory in 30–60 seconds, with Bank of Georgia vs Flitt.  
  **Follow-ups:** When would you *not* add a factory? Where does this show up in Nest (`useFactory`)?
- [ ] Explain the topic in 30–60 seconds: who creates the object, how many exist, how it is assembled — and which three you actually use in Nest/TypeORM.
