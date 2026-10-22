# Creational Design Patterns — Self-test

## Core recall

1. What problem do creational patterns solve, as opposed to structural or behavioral ones?
2. What two guarantees does Singleton make?
3. Why is a JavaScript module already a singleton without `getInstance()`?
4. What is Nest’s default provider scope?
5. When is Singleton OK, and when is it a lie?
6. What does a factory keep the caller from doing?
7. Name the three “factory” terms interviewers mix, and what each creates.
8. What problem does Builder solve that a telescoping constructor does not?
9. What is TypeORM QueryBuilder an example of, and when is `find()` enough instead?
10. What does Prototype mean, and which three JS APIs do people actually use?
11. What does Abstract Factory create that Factory Method does not?

## Explain why

1. Why do two imports of the same module share mutable state?
2. Why is `Logger.getInstance()` painful in tests compared with constructor injection?
3. Why is storing `currentUser` on a Nest singleton service wrong under concurrent requests?
4. Why does injecting a REQUEST-scoped provider change the lifetime of an otherwise-singleton service?
5. Why does a payment factory exist if checkout could `new BogGateway()`?
6. Why is a typed options object often better than a Builder in TypeScript?
7. Why is Abstract Factory usually the wrong thing to lead with in a Nest interview?
8. Why is “one singleton for the whole company” a misconception in a multi-instance Node deploy?

## Compare and contrast

1. Nest `DEFAULT` vs `REQUEST` vs `TRANSIENT`.
2. Module-as-singleton vs class `getInstance()` singleton.
3. Simple factory vs Factory Method vs Abstract Factory.
4. Factory vs Builder — what decision does each defer?
5. Builder vs a TypeScript options object vs constructor overloads.
6. Factory vs Strategy (high level).
7. `Object.create` vs object spread vs `structuredClone`.
8. Nest `useFactory` vs `useClass` vs `useValue`.

## Predict the output

State the result **and explain why**.

1. Two files import the same CJS module (module cache):

```js
// config.js
module.exports = { n: 0 };

// a.js loads first, then b.js
// a.js
const config = require('./config');
config.n += 1;

// b.js
const config = require('./config');
console.log(config.n);
```

What does `b.js` log?

2.

```ts
class Logger {
  private static instance: Logger | null = null;
  readonly id = Math.random();
  private constructor() {}
  static getInstance(): Logger {
    return (Logger.instance ??= new Logger());
  }
}
const a = Logger.getInstance();
const b = Logger.getInstance();
console.log(a === b);
console.log(a.id === b.id);
```

3. Treat `store.ts` as a real ESM module imported by two “requests”:

```ts
// store.ts
export const store = { user: null as string | null };

// request A
import { store } from './store';
store.user = 'alice';

// request B (same process, later)
import { store } from './store';
console.log(store.user);
```

4.

```ts
const original = { a: 1, nested: { b: 2 } };
const clone = structuredClone(original);
clone.nested.b = 9;
console.log(original.nested.b, clone.nested.b);
```

5.

```ts
const original = { a: 1, nested: { b: 2 } };
const shallow = { ...original };
shallow.nested.b = 7;
console.log(original.nested.b, shallow.nested.b);
```

6.

```ts
function createPaymentGateway(provider: 'bog' | 'flitt') {
  return provider === 'flitt' ? { name: 'flitt' } : { name: 'bog' };
}
const g = createPaymentGateway('flitt');
console.log(g.name);
```

7.

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

8.

```ts
const proto = { kind: 'animal' };
const dog = Object.create(proto);
console.log(dog.kind);
dog.kind = 'dog';
console.log(dog.kind, proto.kind);
```

## Debugging

1. Diagnose the production bug. Two overlapping HTTP requests hit this Nest service (default scope). What can go wrong, and how do you fix it?

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

2. Tests fail only when run together. Diagnose:

```ts
// flags.ts
export const flags = { premium: false };

// test A
import { flags } from './flags';
flags.premium = true;
expect(isPremium()).toBe(true);

// test B (later, same process)
import { flags } from './flags';
expect(flags.premium).toBe(false); // fails
```

3. A checkout controller does this. What pattern smell is it, and what do you change?

```ts
@Controller('checkout')
export class CheckoutController {
  @Post()
  pay(@Body() dto: PayDto) {
    const gw = new BogGateway();
    return gw.charge(dto.amount, 'GEL');
  }
}
```

4. This builder is used twice. Why is the second mail wrong, and what should `build()` do?

```ts
class MailBuilder {
  private draft: Partial<Mail> = {};
  to(email: string) { this.draft.to = email; return this; }
  subject(s: string) { this.draft.subject = s; return this; }
  build() { return this.draft as Mail; }
}
const b = new MailBuilder();
const first = b.to('a@b.c').subject('Hi').build();
const second = b.to('z@z.z').subject('Bye').build();
```

## Application

1. Write a tiny module-level singleton: a `config` object plus a `bump()` that increments a module-private counter. State why two importers share it.

2. Write `createPaymentGateway(provider: 'bog' | 'flitt'): PaymentGateway` with two one-line stub classes. The caller must not `new` a vendor.

3. Write a Nest custom provider using `useFactory` that injects `ConfigService` and returns `FlittGateway` or `BogGateway`.

4. Write a 4–5 line TypeORM QueryBuilder chain (alias `appointment`) that joins `vet`, filters `status`, and `getMany()`. State when you would have used `find()` instead.

## Interview questions

1. Explain Singleton in 30–60 seconds.  
   **Follow-ups:** Is Nest’s default scope a singleton? Why is `currentUser` on a service dangerous? How do you test code that used `getInstance()`?

2. Explain Factory in 30–60 seconds, with Bank of Georgia vs Flitt.  
   **Follow-ups:** Factory Method vs Abstract Factory? When would you *not* add a factory? Where does this show up in Nest?

3. When would you **not** use Singleton?  
   **Follow-ups:** Does a singleton survive across multiple Node processes? Config and logger — why are those OK?

4. “Do you use Builder?” — answer with TypeORM in the room.  
   **Follow-ups:** Why not Builder for a 3-field DTO? Options object vs QueryBuilder?

5. Someone asks you to name all creational patterns. What do you lead with, and what do you mention only on follow-up?

## Connections

1. How do JS modules make a Singleton *class* almost redundant?
2. How does Nest DI replace both hand-rolled singletons and hand-rolled factories?
3. How does Builder connect to `find()` vs QueryBuilder?
4. How does a payment factory relate to Adapter (BOG vs Flitt APIs)?
5. How do hidden `getInstance()` / module `let`s connect to testability?
