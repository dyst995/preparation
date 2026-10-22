# Intro to design patterns — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] In one interview-ready sentence, what is a design pattern?
- [ ] Name the three GoF categories and the question each answers.
- [ ] What does “composition over inheritance” mean in JS/TS, given that prototypes and `class` exist?
- [ ] Design pattern vs language feature vs library vs architecture.
- [ ] Naming a pattern vs cargo-culting a pattern.
- [ ] God object vs Facade.
- [ ] Module-as-singleton (or Nest singleton service) vs singleton soup.
- [ ] How do DIP, Adapter, and Nest DI connect?

## Predict / debug

For each snippet: state what happens (log values) **and explain why**. Then say which design idea it demonstrates. For the debug item, diagnose and say what you would split.

- [ ]
```ts
const store = (() => {
  let n = 0;
  return {
    inc() {
      n += 1;
      return n;
    },
    get() {
      return n;
    },
  };
})();

const a = store;
const b = store;
a.inc();
a.inc();
console.log(b.get());
```

- [ ]
```ts
class Rectangle {
  constructor(public w: number, public h: number) {}
  area() {
    return this.w * this.h;
  }
  setWidth(w: number) {
    this.w = w;
  }
}

class Square extends Rectangle {
  setWidth(w: number) {
    this.w = w;
    this.h = w;
  }
}

function widen(r: Rectangle) {
  r.setWidth(10);
  return r.area();
}

console.log(widen(new Rectangle(4, 5)));
console.log(widen(new Square(4, 4)));
```

- [ ] Diagnose the design problem. What would you split, and which principle/pattern names are you using (without cargo-cult)?
```ts
@Injectable()
class AppService {
  constructor(
    private db: DataSource,
    private stripe: Stripe,
    private mail: Mailer,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.db.getRepository(User).save(dto);
    await this.stripe.customers.create({ email: dto.email });
    await this.mail.send({ to: dto.email, template: 'welcome' });
    return user;
  }

  async refund(id: string) { /* stripe + db + mail */ }
  async reportRevenue() { /* raw SQL */ }
}
```

## Say it out loud

- [ ] Explain design patterns in 30–60 seconds as if an interviewer asked.
- [ ] What is a design pattern?  
  **Follow-ups:** How is that different from a library? Give one example from Nest or React. Do you need to know all 23 GoF patterns?
- [ ] JS has prototypes and classes. Do you still “prefer composition over inheritance”? Why?  
  **Follow-ups:** Where is `extends` still reasonable? How does Nest DI fit? How would you reuse UI chrome in React without a base screen class?
