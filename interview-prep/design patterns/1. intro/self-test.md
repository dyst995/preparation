# Intro to design patterns — Self-test

## Core recall

1. In one interview-ready sentence, what is a design pattern?
2. Besides a name, what four parts does a pattern have?
3. Name the three GoF categories and the question each answers.
4. What does “composition over inheritance” mean in JS/TS, given that prototypes and `class` exist?
5. Name the four layers people mash together (language / pattern / library / architecture) and one example of each.
6. Give three situations where naming a pattern in an interview or PR is useful, and one where it is cargo-cult.
7. SRP, OCP, DIP — one line each, as they relate to patterns (not a SOLID recitation).
8. Name the three anti-patterns from this unit, one line each.
9. What is Nest’s default provider scope, and when is that *not* singleton soup?
10. How can an ES module implement the Singleton *shape* without `getInstance()`?

## Explain why

1. Why do shared pattern names exist if the compiler does not care?
2. Why is composition the default in JS/TS app design even though the language has prototypes and `extends`?
3. Why is Nest constructor injection composition rather than inheritance?
4. Why is “React is the Observer pattern” sloppy?
5. Why is an interface with a single unused implementation not DIP?
6. Why is Nest’s default singleton scope not automatically an anti-pattern?
7. Why does “I use design patterns” as a list of 23 names fail a senior interview?

## Compare and contrast

1. Creational vs structural vs behavioral — what varies in each?
2. Inheritance (`extends`) vs composition (has-a / inject / wrap) for reuse.
3. Design pattern vs language feature vs library vs architecture.
4. Naming a pattern vs cargo-culting a pattern.
5. God object vs Facade.
6. Module-as-singleton (or Nest singleton service) vs singleton soup.
7. SRP vs OCP vs DIP — what decision does each change?

## Predict the output

For each snippet: state what happens (log values) **and explain why**. Then say which design idea it demonstrates.

1.
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

2.
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

## Debugging

1. Diagnose the design problem. What would you split, and which principle/pattern names are you using (without cargo-cult)?
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

2. Diagnose. What would you delete or keep, and why?
```ts
interface UserRepo {
  find(id: string): Promise<User | null>;
}
class TypeormUserRepo implements UserRepo {
  find(id: string) { return this.repo.findOne({ where: { id } }); }
}
class UserRepoFactory {
  static create() { return new TypeormUserRepo(); }
}

@Injectable()
class UsersService {
  private repo = UserRepoFactory.create();
  find(id: string) { return this.repo.find(); }
}
```

3. A React Native screen does this for “shared chrome.” Diagnose and say the composition-shaped fix.
```tsx
class ScreenWithHeader extends React.Component {
  renderHeader() { return <Header />; }
}
class HomeScreen extends ScreenWithHeader {
  render() {
    return (
      <>
        {this.renderHeader()}
        <Feed />
      </>
    );
  }
}
```

## Application

1. Rewrite this to composition. Keep logging; drop the is-a relationship. Show a test-friendly seam.
```ts
class Logger {
  log(msg: string) { console.log(msg); }
}
class OrderService extends Logger {
  place() { this.log('placed'); }
}
```

2. Assign each to a category (creational / structural / behavioral) and say why in one line:
   - Nest `guards → interceptors → pipes → handler`
   - `stripeAdapter` implementing `PaymentPort`
   - An ES module that exports one `logger` object

3. You have one Stripe client used in one Nest service. A second provider (Apple Pay) is on the roadmap for next quarter. What do you ship *now*, and what do you wait to add? Name the pattern only if you introduce it.

## Interview questions

1. What is a design pattern?  
   **Follow-ups:** How is that different from a library? Give one example from Nest or React. Do you need to know all 23 GoF patterns?

2. JS has prototypes and classes. Do you still “prefer composition over inheritance”? Why?  
   **Follow-ups:** Where is `extends` still reasonable? How does Nest DI fit? How would you reuse UI chrome in React without a base screen class?

3. What design patterns do you actually use?  
   **Follow-ups:** When would you *not* introduce Strategy? Is Nest’s default singleton a Singleton pattern / an anti-pattern? What’s the difference between GoF Bridge and the RN Bridge?

4. When do you name a pattern in an interview, and when is that cargo-cult?  
   **Follow-ups:** Tell me about a time you *removed* an abstraction. How do SRP/OCP/DIP show up without turning the answer into a SOLID lecture?

## Connections

1. How do DIP, Adapter, and Nest DI connect?
2. How does a failed SRP become a god object, and how is that different from a Facade?
3. How can a language feature (modules or closures) implement a pattern without ceremony?
4. If OCP is applied before a second variant exists, which anti-pattern do you get, and why?
