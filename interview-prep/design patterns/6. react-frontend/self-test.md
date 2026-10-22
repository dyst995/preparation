# Applying design patterns in React / React Native UI — Self-test

## Core recall

1. What is React’s default composition slot, and what does the parent typically pass into it?
2. What inheritance pattern is the red flag in React / RN UI?
3. Name three Observer subjects in a typical React/RN UI and how a component subscribes to each.
4. In one sentence, what is a stale closure in an Observer callback?
5. What replaces a growing `switch` / ternary in JSX for button variants or payment-method UI?
6. Which React API is closest to GoF Decorator? Which API is composition of behavior instead?
7. Where should API DTO → view-model mapping happen? What must screens not read?
8. What two pieces make a practical compound component?
9. How do you map “container / presentational” onto today’s React?
10. One sentence: Gang of Four Bridge vs the React Native Bridge.

## Explain why

1. Why is `class PrimaryButton extends Button` a trap even if the UI looks right?
2. Why did custom hooks replace render-prop libraries for *behavior*, while `renderItem` is still fine?
3. Why is Context Observer with coarser grain than a Zustand selector?
4. Why does `Tick` with `setInterval(() => setN(n + 1), 1000)` and `[]` deps stick at `1` even though the interval fires?
5. Why put payment methods in a component map instead of `switch (method)` inside `Pay`’s JSX?
6. Why is `useAuth()` not a Decorator even though it “adds” auth behavior to `Home`?
7. Why is `<Text>{item.amt_cents / 100}</Text>` on three screens an Adapter failure, not a formatting preference?
8. Why does a compound `Tabs` use a *private* Context instead of drilling `activeId`, and why is that still not an app-wide store?
9. Why do interviewers still say “container / presentational” if hooks made the extra container *component* optional?

## Compare and contrast

1. `function PrimaryButton(props) { return <Button {...props} variant="primary" /> }` vs `class PrimaryButton extends Button`
2. `children` vs a render prop vs a custom hook — what each composes
3. `setState` vs Context vs Zustand as Observer
4. `withAuth(Home)` vs `useAuth()` inside `Home`
5. GoF Decorator vs React composition (hooks / `children`)
6. Mapping DTO → view model at the API boundary vs renaming fields in JSX
7. Compound-component Context vs app-wide Theme/Auth Context
8. 2015 `UserCardContainer` + `connect` vs `useUserCard` + presentational `UserCard`
9. GoF Bridge pattern vs React Native Bridge

## Predict the output

For each snippet: state what happens (runtime, types, or UI) **and explain why**.

1.
```tsx
function Tick() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN(n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{n}</span>;
}
```
What does the UI show after several seconds?

2.
```tsx
const buttonClass = { primary: 'btn-primary', ghost: 'btn-ghost' } as const;
type ButtonVariant = keyof typeof buttonClass;
function Button({ variant }: { variant: ButtonVariant }) {
  return <button className={buttonClass[variant]} />;
}
<Button variant="danger" />
```
Compile or run? Why?

3.
```tsx
const methodUi = { card: CardForm, apple: ApplePayButton } as const;
function Pay({ method }: { method: 'card' | 'apple' | 'google' }) {
  const View = methodUi[method];
  return <View />;
}
<Pay method="google" />
```
What goes wrong?

4.
```tsx
function Tab({ id }: { id: string }) {
  const ctx = useContext(TabsCtx); // TabsCtx default is null
  if (!ctx) throw new Error('Tab must be used in Tabs');
  return <button>{id}</button>;
}
// render:
<Tab id="wallet" />
```
What happens on render?

5.
```tsx
function WalletRow({ dto }: { dto: { amt_cents: number } }) {
  return <Text>{dto.amt_cents / 100}</Text>;
}
```
What pattern is missing, and what breaks when the API renames `amt_cents`?

6.
```tsx
const PrivateHome = withAuth(Home);
function Home() {
  const session = useAuth();
  return <Dashboard />;
}
```
How many auth wrappers / compositions are in play, and is that a problem?

## Debugging

1. A design-system `PrimaryButton` is `class PrimaryButton extends Button`. Adding a `loading` spinner to `Button` breaks every subclass’s layout. Diagnose the pattern mistake and the fix.

2. A Zustand subscriber logs `count` from a `store.subscribe(() => console.log(count))` registered in `useEffect(() => { … }, [])`, where `count` comes from `useState` in the same component. The store updates; the log stays `0`. Diagnose using Observer + closure. Fix without tearing down the store.

3. `PayScreen` is a 120-line `switch (method)` of Card / Apple Pay / Google Pay JSX. A fourth method is coming. Diagnose and refactor the shape (no need for full components).

4. Wallet, Confirm, and Receipt each do `(item.amt_cents / 100).toFixed(2)` with slightly different null checks. One screen shows the wrong amount after a backend string-minor-units change. Diagnose. Where does the Adapter live?

5. `Select.Item` works in Storybook wrapped in `Select.Root` but crashes in a screen that rendered only `Select.Item`. Diagnose.

6. A teammate adds `export const Page = withSpinner(withAuth(withAnalytics(Settings)))` for a new settings screen. You already have `useAuth`. What do you change, and what might you still leave wrapped?

## Application

1. Write a function-component `PrimaryButton` that *uses* `Button` (typed `Omit<ButtonProps, 'variant'>`). One sentence: why this is composition, not inheritance.

2. Write a `buttonClass` strategy map + `Button` that indexes it. Add a `link` variant without touching a `switch`.

3. Given `PaymentDto = { amt_cents: number; st: string }`, write `PaymentView`, `paymentFromDto`, and a presentational `WalletRow` that only accepts `PaymentView`.

4. Sketch `Tabs` + `Tabs.Tab` with a private context (provider, throw if missing, usage JSX). No need for panels.

5. Refactor this into hook + presentational (keep the view reusable for Storybook):

```tsx
function UserCard({ id }: { id: string }) {
  const { data } = useUser(id);
  if (!data) return null;
  return (
    <article>
      <img src={data.avatarUrl} alt="" />
      <h2>{data.displayName}</h2>
    </article>
  );
}
```

## Interview questions

1. What design patterns do you use in React / React Native UI?
   **Follow-ups:** Why not inherit components? Where does Strategy show up? Where does Adapter live?

2. Are HOCs the Decorator pattern? Why not use them for everything?
   **Follow-ups:** `React.memo`? `connect`? Error boundaries?

3. Explain a stale closure in an interval or store listener as Observer + closure.
   **Follow-ups:** functional `setState`? refs? putting the value in deps?

4. How do you keep backend JSON out of the component tree?
   **Follow-ups:** outbound POST? mapping in an Axios interceptor?

5. What is a compound component? When is it overkill?
   **Follow-ups:** is that just Context? difference from app-wide Auth context?

6. “We use container / presentational components.” How do you answer in 2026?
   **Follow-ups:** when do you still split two files? where does the Adapter sit?

7. Someone in an RN interview says “tell me about the Bridge pattern.” What do you disambiguate first?

## Connections

1. How do Observer and closures combine into the stale-callback bug?
2. How does Adapter feed presentational components (and the old container/presentational split)?
3. How is an HOC Decorator while a custom hook is the same *idea* as composition-over-inheritance?
4. How is a compound component both composition (`children`) and Observer (context subscription)?
5. How do Strategy maps and TypeScript discriminated unions back each other?
6. Which patterns sit inside a typical `usePayment(id)` hook (Observer, Adapter, maybe Strategy)?
7. Why must you *not* answer a React UI patterns question with the RN Bridge?
