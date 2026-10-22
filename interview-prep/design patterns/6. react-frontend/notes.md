# Applying design patterns in React / React Native UI

## What you need to know

This unit **maps named patterns onto React**. It does not re-teach Fiber, reconciliation, or hooks. The interview move is to **point at your UI**, name the pattern, say when you would not use it, and name the React-shaped alternative.

Machinery you already have: [composition / `children`](../../react/24.%20prop-drilling/notes.md), [custom hooks](../../react/16.%20custom-hooks/notes.md), [`useState`](../../react/11.%20usestate/notes.md) / [Context](../../react/20.%20context/notes.md) / [Zustand](../../react/22.%20zustand/notes.md), [closures](../../typescript-javascript/3.%20closures/notes.md) + [effect deps](../../react/12.%20useeffect/notes.md), [DTO typing](../../typescript-javascript/28.%20api-dto-typing/notes.md) / [RN data-domain](../../react-native/19.%20data-domain/notes.md). Pattern names: [intro](../1.%20intro/notes.md) (composition vs inheritance), [structural](../3.%20structural/notes.md) (Adapter, Decorator), [behavioral](../4.%20behavioral/notes.md) (Observer, Strategy).

**GoF Bridge ≠ React Native Bridge.** Gang of Four Bridge splits an abstraction from its implementors so they vary independently — [structural](../3.%20structural/notes.md). The **RN Bridge** is the legacy JS↔native **message transport** — [RN bridge](../../react-native/2.%20bridge/notes.md). Same word, unrelated ideas. In an RN round, “bridge” means transport unless they say “pattern.”

Web and RN share the **same component model**. `View`/`Pressable` vs `div`/`button` does not change these patterns.

---

## Composition over inheritance

React’s public API is **composition**: a parent chooses what to render and passes **elements** (or a render function) into slots. **Class inheritance of components is the red flag.**

### `children` is the default slot

```tsx
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

function Profile({ user }: { user: { name: string } }) {
  return (
    <Card>
      <Avatar name={user.name} />
    </Card>
  );
}
```

`Card` does not know `user`. The parent already owns that data and **places** `<Avatar>` in the shell. Combine by **containing**, not by subclassing. Named slots (`header`, `footer`) are the same idea. [Prop drilling](../../react/24.%20prop-drilling/notes.md) often disappears once the intermediate is a shell, not a relay.

### Render props — use lightly

A **render prop** is a function-as-child (or `renderItem`) the child calls with data:

```tsx
type ListProps<T> = { items: T[]; renderItem: (item: T) => React.ReactNode };

function List<T>({ items, renderItem }: ListProps<T>) {
  return <>{items.map((item, i) => <div key={i}>{renderItem(item)}</div>)}</>;
}

<List items={users} renderItem={(u) => <UserRow user={u} />} />
```

`List` owns iteration; the caller owns the row. Still composition — not a second pattern you must name for every list. Pre-hooks libraries used render props for **behavior** (`<Mouse>{pos => …}</Mouse>`); they nested into wrapper hell. **Custom hooks** replaced that. Keep render props for **injection points** (rows, cells), not for “I need a subscription.”

### Custom hooks compose *behavior*

A hook composes stateful logic **into** the caller. It does not wrap the tree and does not share a store ([custom hooks](../../react/16.%20custom-hooks/notes.md)). Two screens calling `useDebouncedValue` share an *algorithm*, each with its own slots.

### Red flag: `class PrimaryButton extends Button`

```tsx
// RED FLAG
class PrimaryButton extends Button {
  render() {
    return <button className="base primary">{this.props.label}</button>;
  }
}
```

You inherit **implementation** (classes, internal state, lifecycle), not a UI contract. Single inheritance: you cannot also extend `Touchable` and `Themed`. Fragile base class: changing `Button.render` breaks subclasses. Hooks are for function components; a class hierarchy freezes you out. Interviewers treat this as a senior-negative.

**Compose instead** — wrap, or pass a variant:

```tsx
function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="primary" />;
}
```

`PrimaryButton` **uses** `Button`. Wrapping function ≠ subclass.

---

## Observer in UI

The tree is an **observer graph**: a **subject** holds data; components **subscribe**; a change **re-renders** subscribers. You already know the three subjects — this section only names them Observer.

| Subject | Subscribe | Notify |
| --- | --- | --- |
| Component state | `useState` / `useReducer` **here** | `setState` → re-render **this** observer |
| Context | `useContext(Ctx)` under a Provider | `value` identity (`Object.is`) → **all** consumers |
| Zustand (or Redux) | `useStore(selector)` | selector result `Object.is`-equal → **skip** |

`setState` is Observer with one subscriber (plus children React re-renders as a consequence). Context is Observer with **fan-out** and **no selector**. Zustand is Observer with **filtered** subscriptions. Same pattern, different grain. Do not re-derive Fiber: **notify → schedule a re-render of the observers.**

React Query is Observer too (cache subject, `useQuery` subscribes). Classify it as **server state**, not a fourth UI store.

### Stale closures: the observer + closure trap

A subscription is often **long-lived** (interval, store listener, WebSocket). The callback is created in **one render**, so it closes over **that** props/state ([closures](../../typescript-javascript/3.%20closures/notes.md)). If you never recreate the subscription, the observer still fires — it reads an **old snapshot**.

```tsx
function Tick() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN(n + 1), 1000);
    return () => clearInterval(id);
  }, []); // subscribed once; callback forever sees n === 0
  return <span>{n}</span>; // sticks at 1
}
```

The interval **did** observe time. Observer did not fail. The callback closed over the first render’s `n`; every tick is `setN(0 + 1)`.

Fixes — **which environment the observer callback points at**:

1. **Functional updater** — `setN((x) => x + 1)` does not read `n` from the closure.
2. **Resubscribe** — put `n` in deps (works; churny for high-frequency listeners).
3. **Ref to latest** — `nRef.current = n` during render; the long-lived listener reads the ref.

Empty deps + closed-over state is the classic snippet. Say: **Observer notified me; the closure was bound to the render that subscribed.**

---

## Strategy: variants instead of a switch in JSX

**Strategy** = swap the algorithm, keep the caller. In UI the “algorithm” is often **which styles / which sub-tree**. Smell: a growing `switch` / ternary **inside JSX** that every new variant must edit (`variant === 'primary' ? 'btn-primary' : …`). Three variants is fine. Twelve variants or payment-method screens are not. Put strategies in a **map**:

```tsx
const buttonClass = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
} as const;

type ButtonVariant = keyof typeof buttonClass;

function Button({ variant, label }: { variant: ButtonVariant; label: string }) {
  return <button className={buttonClass[variant]}>{label}</button>;
}
```

Adding `link` is a new key (+ type), not another branch. TypeScript rejects `variant="ghostt"`.

Same shape for **payment method UI**:

```tsx
type Method = 'card' | 'apple' | 'google';

const methodUi: Record<Method, React.ComponentType<{ onPay: () => void }>> = {
  card: CardForm,
  apple: ApplePayButton,
  google: GooglePayButton,
};

function Pay({ method, onPay }: { method: Method; onPay: () => void }) {
  const View = methodUi[method];
  return <View onPay={onPay} />;
}
```

`Pay` does not `switch` through forms. Each method component **is** a strategy. New method = new component + one map entry. Discriminated unions (`{ type: 'card'; pan: string } | { type: 'apple' }`) keep the data side in sync.

Do **not** Strategy-map a one-off boolean (`isLoading`). A lookup table earns its keep when variants **multiply** or each variant is a **real component**.

---

## “Decorator” in React: HOCs vs custom hooks

GoF **Decorator** wraps an object, keeps the same interface, adds behavior. Closest React analogue: a **higher-order component** — function in, wrapped component out.

```tsx
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function Authed(props: P) {
    const session = useSession();
    if (!session) return <LoginRedirect />;
    return <Component {...props} />;
  };
}

const PrivateHome = withAuth(Home);
```

`Home`’s props did not change. The gate sits in a **wrapper**. That **is** Decorator: wrap, same outward type, extra responsibility.

**Custom hooks are not Decorators.** `useAuth()` composes logic **into** `Home` — no wrapper node, no `displayName` / ref-forwarding tax. That is **composition of behavior**, same family as composition over inheritance.

```tsx
function Home() {
  const session = useAuth();
  if (!session) return <LoginRedirect />;
  return <Dashboard />;
}
```

Prefer hooks for **new** code. HOCs still appear:

| Survivor | Why it is still a wrap |
| --- | --- |
| `React.memo(Component)` | Skip re-render — performance Decorator |
| `React.forwardRef(Component)` | Expose a ref; often composed with `memo` |
| Legacy Redux `connect(mapState)(View)` | Subscribe + inject props — Observer + Decorator |
| `withTranslation` / old i18n / analytics HOCs | Library predates hooks |
| Error boundaries | Must be a class; you *wrap* a tree |

Costs: wrapper hell (`withA(withB(withC(Page)))`), ref + static hoisting, prop collisions, harder types. Maintain `connect` if you must; do not add a new `withX` when a hook would do.

---

## Adapter: DTO → view model at the boundary

GoF **Adapter** converts one interface into the one a client already speaks. The **client is the view**. The **foreign interface is the JSON DTO**. Map once at the **API boundary**; do not sprinkle wire field names through the tree.

```tsx
type PaymentDto = { amt_cents: number; st: string };
type PaymentView = { amountMinor: number; status: 'pending' | 'completed' | 'failed' };

function paymentFromDto(dto: PaymentDto): PaymentView {
  return { amountMinor: dto.amt_cents, status: statusFromWire(dto.st) };
}

function WalletRow({ payment }: { payment: PaymentView }) {
  return <span>{formatMinor(payment.amountMinor)}</span>;
}
```

Screens take `PaymentView`, never `dto.amt_cents` / `dto.st`. A backend rename touches **the mapper**, not the tree.

Smell: `<Text>{(item.amt_cents / 100).toFixed(2)}</Text>` and `dto.st === 'PND'` in JSX. Three screens invent three interpretations. Fintech: wrong money or wrong state, not a cosmetic rename. Mapping lives next to the fetch (`queryFn` / `select` / `model/mappers.ts`) — [data-domain](../../react-native/19.%20data-domain/notes.md).

Outbound is Adapter too: view-model → request DTO before `POST`. Do not map in a **global** HTTP interceptor (god adapter that knows every feature).

---

## Provider / compound components

A **compound component** is a family that **only makes sense together**: `Tabs` + `Tabs.List` + `Tabs.Panel`, `Select.Root` + `Trigger` + `Item`. The parent **provides** shared state; children **consume** it. Implementation: **Context provider + related children** — composition with an implicit channel, not drilling `activeId`.

```tsx
const TabsCtx = createContext<{ active: string; setActive: (id: string) => void } | null>(null);

function Tabs({ defaultId, children }: { defaultId: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultId);
  return <TabsCtx.Provider value={{ active, setActive }}>{children}</TabsCtx.Provider>;
}

function Tab({ id, children }: { id: string; children: React.ReactNode }) {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error('Tab must be used in Tabs');
  return (
    <button onClick={() => ctx.setActive(id)} data-active={ctx.active === id}>
      {children}
    </button>
  );
}

Tabs.Tab = Tab;

<Tabs defaultId="wallet">
  <Tabs.Tab id="wallet">Wallet</Tabs.Tab>
  <Tabs.Tab id="cards">Cards</Tabs.Tab>
</Tabs>
```

The caller composes the pieces; the library owns the coupling. Radix / Headless UI / RN paper menus are this pattern.

**Worth it:** cooperating children and a JSX-shaped API (`Select.Item` anywhere inside `Select`). **Not:** a `Button` with no secret channel; a one-level parent that can pass props. Context here is a **private implementation detail**, not a global app store. Missing provider → `null` → throw in the child. Fail fast; that is a feature.

---

## Container / presentational — dated name, live interview

~2015: **container** (smart) fetches / subscribes / maps dispatch; **presentational** (dumb) receives props and renders. Redux `connect` made the split mechanical.

Hooks made a dedicated container **component** optional. The “container” is usually a **custom hook**. Keep a presentational child when you need Storybook / reuse.

```tsx
function UserCard({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  return (
    <article>
      <img src={avatarUrl} alt="" />
      <h2>{name}</h2>
    </article>
  );
}

function useUserCard(id: string) {
  const { data } = useUser(id);
  return data ? { name: data.displayName, avatarUrl: data.avatarUrl } : null;
}

function UserCardScreen({ id }: { id: string }) {
  const vm = useUserCard(id);
  if (!vm) return null;
  return <UserCard {...vm} />;
}
```

If they say “container / presentational,” map it: **hook (or screen) owns subscriptions and Adapter; presentational owns markup.** Do not invent `FooContainer.tsx` + `Foo.tsx` for every widget. Split when the view is reused, snapshot-tested, or the data wiring is thick.

---

## Common mistakes and misconceptions

1. **Subclassing components** (`class Primary extends Button`) instead of wrapping / variants.
2. Calling render props and HOCs “the React way” in 2026 — they survive in slots and legacy wraps; hooks + `children` are the default.
3. Treating Context as a selector-based store (Observer with **coarse** grain).
4. Stale closure blamed on “React not updating” — the observer fired; the callback closed over an old render.
5. A 40-branch `switch` in JSX instead of a strategy / component map.
6. New `withX` HOCs when a hook would compose the same behavior without a wrapper.
7. **`dto.amt_cents` in three screens** — Adapter never ran; the wire leaked.
8. Compound children without a provider, or app-wide Context for a Tabs widget.
9. Splitting every component into container + view because a 2016 blog post said so.
10. Saying “Bridge pattern” when you mean the **RN JS↔native transport**.

---

## Connections to other concepts

```
composition (children / wrap / hooks)  →  not class inheritance
Observer (setState / context / Zustand / RQ) + subscribe-time closure  →  stale callback
Strategy map  →  Button variants, payment method UI, discriminated unions
GoF Decorator  →  HOC wrap (memo, connect, withX); hooks compose in, not wrap around
GoF Adapter  →  DTO → view model at mapper; presentational props are the target interface
Provider + related children  →  compound component (private context, not a global store)
container / presentational  →  today: hook + presentational; Adapter often sits in the hook
GoF Bridge (structural unit)  ≠  RN Bridge (transport unit)
```

---

## Interview perspective

**Q: What design patterns do you use in React?**

Spoken (~30–45s):

> The tree is **composition**, not class inheritance — `children`, maybe a render prop for a slot, custom hooks for behavior. UI state is **Observer**: `setState`, Context, or a Zustand selector. Variants and payment methods are a **Strategy** map, not a switch in JSX. HOCs are the old **Decorator** wrap; I write **hooks** unless I need `memo` / a legacy `connect`. JSON is **Adapted** to a view model at the boundary so screens never see `amt_cents`. Tabs/Select are **compound components** (provider + family). If you say container/presentational, I map that to a **hook plus a presentational view**.

Follow-ups they actually run:

- Why not extend `Button`? Fragile base class, single inheritance, hooks are functions.
- Stale closure in an interval / store listener — Observer + which lexical environment.
- HOC vs hook — wrap vs compose; when `memo` / `connect` still wrap.
- Where mapping lives — one mapper, not JSX.
- Compound vs global Context — private widget channel vs app-wide store.
- “Isn’t container/presentational dead?” — **data wiring vs view** is not; the extra container *component* often is.

Do not volunteer GoF Bridge in a React UI answer. If they say “bridge,” disambiguate RN transport vs the structural pattern.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
