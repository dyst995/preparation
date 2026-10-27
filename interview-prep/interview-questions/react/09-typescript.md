# React + TypeScript

### REACT-401 — Typing a component's props
**Difficulty:** Junior
**Category:** Props
**Question:**
How do you describe the props of a function component in TypeScript?

**Answer:**
Props are the values a parent passes into a component. You name that shape with an interface or a type alias, then annotate the function argument, as in `function UserCard({ name }: UserCardProps)`. TypeScript checks every place the component is used, so a missing field or a value of the wrong kind fails while you edit. Keeping the props type next to the component makes the contract easy to read and easy to import when another file builds the same data. Explicit props are the usual starting point because the type stays local and the call sites stay honest.

**Code:**
```tsx
type UserCardProps = { name: string; age: number };
function UserCard({ name, age }: UserCardProps) {
  return <p>{name} ({age})</p>;
}
```

**Follow-up:**
Should that props type be exported?

Answer: Export it when other modules construct the same object or wrap the component. Leave it unexported when only this file should know the shape.

### REACT-402 — Interface or type alias for props
**Difficulty:** Intermediate
**Category:** Props
**Question:**
Should component props be an interface or a type alias?

**Answer:**
Both an interface and a type alias can describe a props object, and for a simple component the difference is small. An interface can be extended with `extends` and, in the same name, merged if another declaration adds fields. A type alias can also express unions, intersections, and mapped types, which you need once props are not a single flat object. Pick one style and keep it. Many codebases use an interface for public component props and a type alias when the shape is a union. The goal is a name callers can read, not a clever form.

**Follow-up:**
Does React itself care which one you choose?

Answer: No. React only sees the props value at runtime. The interface or alias exists so TypeScript can check the JSX call.

### REACT-403 — Typing children
**Difficulty:** Junior
**Category:** Children
**Question:**
How do you type the children a component renders?

**Answer:**
Children are whatever you nest between a component's opening and closing tags. The broad type is `React.ReactNode`, which allows elements, strings, numbers, fragments, portals, and `null`. You add `children: React.ReactNode` to the props type, or you use `PropsWithChildren` if the rest of the props already have a name. A wide type is right for layout wrappers that should accept almost anything. When the component can only render one kind of child, a narrower type documents that limit and stops a caller from passing a plain string by mistake.

**Follow-up:**
Does `ReactNode` include `undefined`?

Answer: Yes. A missing child, `null`, and a boolean are all allowed, which is why conditional rendering like `{flag && <Row />}` type-checks inside a `ReactNode` slot.

### REACT-404 — Narrow children on purpose
**Difficulty:** Intermediate
**Category:** Children
**Question:**
When should children be narrower than `React.ReactNode`?

**Answer:**
`React.ReactNode` means "almost any renderable value." Sometimes that is too loose. A tabs component might require `children` to be a list of `Tab` elements, and a button might allow only text. You express that with `React.ReactElement`, a specific component's element type, or a small union such as `string | React.ReactElement`. Narrowing is worth it when the parent inspects its children or the design system wants one obvious usage. It is annoying when the restriction rejects fragments and valid composition. Start wide, then tighten the type only after the API is clear.

**Trade-offs:**
A tight child type catches misuse early, but it also blocks composition patterns you may want later, such as wrapping a child in a fragment or a context provider.

**Follow-up:**
How do you type a single element child?

Answer: Use `React.ReactElement` when any element is fine. Use `React.ReactElement<TabProps>` when the child must be that component's element.

### REACT-405 — PropsWithChildren
**Difficulty:** Intermediate
**Category:** Children
**Question:**
What does `PropsWithChildren` add to a props type?

**Answer:**
`PropsWithChildren<P>` takes your props type and adds an optional `children` field typed as `React.ReactNode`. You use it when a component already has its own props and should also accept nested content, for example `function Card(props: PropsWithChildren<CardProps>)`. The helper keeps you from repeating the children field on every layout component. Children stay optional, so a caller may render `<Card title="Hi" />` with nothing inside. If children are required, write `children: React.ReactNode` yourself instead of the helper, because the helper will not force the caller to pass them.

**Code:**
```tsx
type CardProps = { title: string };
function Card({ title, children }: PropsWithChildren<CardProps>) {
  return <section><h2>{title}</h2>{children}</section>;
}
```

**Follow-up:**
Why not put children on `React.FC` and stop there?

Answer: `PropsWithChildren` adds children without forcing the `FC` wrapper. You keep an ordinary function and an explicit return type if you want one.

### REACT-406 — React.FC versus a plain function
**Difficulty:** Intermediate
**Category:** Component types
**Question:**
What is the difference between `React.FC` and a function with an explicit props argument?

**Answer:**
`React.FC<Props>`, also written `React.FunctionComponent<Props>`, is a type for a function component. You annotate the constant, and TypeScript treats that function as a component with those props. A plain function types the argument directly: `function Button({ label }: ButtonProps)`. Both describe the same runtime function. The plain form makes the parameter list the source of truth and leaves the return type to inference, usually `JSX.Element` or `React.ReactElement`. `React.FC` wraps that idea in one alias. Most new code prefers the plain function because the annotation sits on the value you actually read.

**Follow-up:**
Does `React.FC` change the emitted JavaScript?

Answer: No. It is erased at compile time. The choice only affects checking, hints in the editor, and which extra fields the props type includes.

### REACT-407 — Why teams skip React.FC
**Difficulty:** Intermediate
**Category:** Component types
**Question:**
Why do many teams avoid `React.FC` for new components?

**Answer:**
`React.FC` used to add `children` automatically, so every component looked like it accepted nested content even when it did not. React 18 types dropped that implicit children behavior, but an explicit props argument is still easier to see. Generics also fit a plain function better, because the type parameters live on the function itself. Teams skip `FC` so the contract is written once and children appear only when the component truly renders them.

**Follow-up:**
Is `React.FC` wrong if a codebase already uses it?

Answer: It is not a bug. Keep it for consistency inside an old file, and use an explicit props argument when you add a component that should not grow hidden fields.

### REACT-408 — Optional props and default values
**Difficulty:** Junior
**Category:** Props
**Question:**
How do you type an optional prop and give it a default?

**Answer:**
An optional prop is a field marked with `?`, so the caller may omit it. The default belongs in the parameter list, not in the type. Writing `name = "friend"` fills a missing string at runtime. TypeScript does not apply the default for you; the type only says the value might be missing. Use `undefined` as the missing case. Do not type the prop as a required string and then default it, or the caller is forced to pass a value the default was meant to cover.

**Code:**
```tsx
type GreetingProps = { name?: string };
function Greeting({ name = "friend" }: GreetingProps) {
  return <p>Hello, {name}</p>;
}
```

**Follow-up:**
What if the default is an object?

Answer: Put the object default in the parameter, or build it inside the function. Do not create that object in the type. Types disappear at build time and cannot supply a runtime value.

### REACT-409 — Typing a click handler
**Difficulty:** Junior
**Category:** Events
**Question:**
How do you type a button click handler?

**Answer:**
A click handler receives React's mouse event for that element. For a button, the parameter is `React.MouseEvent<HTMLButtonElement>`. You can write the function inline and let the JSX `onClick` type infer the event, which is enough for most components. Name the event type when the handler is declared outside the JSX or passed through props, so the element argument stays accurate. React's event is a cross-browser wrapper around the native event. Typing it gives you `currentTarget`, modifier keys, and `preventDefault` without guessing. Use the DOM element that actually owns the handler as the type argument.

**Code:**
```tsx
function save(event: React.MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}
```

**Follow-up:**
What type do you use if the handler sits on a `div`?

Answer: Use `React.MouseEvent<HTMLDivElement>`. The type argument should match the element that receives `onClick`, because `currentTarget` is that element.

### REACT-410 — Typing an input change handler
**Difficulty:** Intermediate
**Category:** Events
**Question:**
How do you type `onChange` for a text input?

**Answer:**
An input's change handler receives `React.ChangeEvent<HTMLInputElement>`. The new text is `event.target.value`, which is a string for a text input. Annotate the handler when it is a named function or a prop; an inline arrow can often infer the event from `onChange`. The element type matters: a textarea uses `HTMLTextAreaElement`, and a select uses `HTMLSelectElement`. Those elements still expose `value`, but other fields differ. Typing the event keeps `value` as a string and stops you from reading properties that exist only on a different control. For a checkbox, read `checked` instead of treating `value` as the source of truth.

**Follow-up:**
Why is `event.target.value` sometimes typed too loosely?

Answer: `target` is the element that dispatched the event, and it can be a child. `currentTarget` is the element the listener is on. Prefer `currentTarget` when you need the input you attached the handler to.

### REACT-411 — Typing a form submit handler
**Difficulty:** Intermediate
**Category:** Events
**Question:**
How do you type a form's submit handler?

**Answer:**
A submit handler takes `React.FormEvent<HTMLFormElement>`. You call `event.preventDefault()` so the browser does not navigate, then read the fields you care about. The form element is `event.currentTarget`, so you can pass it to `FormData`. Inline handlers infer this type from `onSubmit`. If your own component exposes submit, pass the raw event only when the parent needs it, and pass parsed values when it does not. The type documents that this function belongs to a form, not a button click.

**Code:**
```tsx
function onSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
}
```

**Follow-up:**
Should your component's `onSubmit` prop pass the event through?

Answer: Pass the event only when the parent must call `preventDefault` or inspect the form. Otherwise pass the already parsed values so the parent stays free of DOM types.

### REACT-412 — target versus currentTarget
**Difficulty:** Intermediate
**Category:** Events
**Question:**
Why do React event types distinguish `target` from `currentTarget`?

**Answer:**
`currentTarget` is the element the listener is attached to. `target` is the element that actually started the event, which may be a child. TypeScript models that split. On `React.MouseEvent<HTMLButtonElement>`, `currentTarget` is the button, while `target` is a broader `EventTarget` because the click might have landed on an icon inside the button. That is why `target.value` often fails to type-check until you narrow it. Use `currentTarget` when you want the component's own element. Narrow `target` with `instanceof` only when the child is what you must read. The distinction prevents treating every nested node as if it were the button.

**Follow-up:**
Does this differ from a native DOM listener?

Answer: The meaning is the same. React's type definitions make the gap obvious, while a quick native handler sometimes hides it behind an `any`-like habit.

### REACT-413 — Letting useState infer the type
**Difficulty:** Junior
**Category:** State
**Question:**
When can `useState` infer its type without a type argument?

**Answer:**
`useState` looks at the first value you pass and uses that as the state type. `useState(0)` is a number, and `useState("hi")` is a string. Inference is the right default when the initial value already includes every field you will store later. The setter then accepts that type or an updater that returns it. Add a type argument only when the start value is narrower than later values, such as `null` now and a user after a request. Annotating a simple boolean only adds noise.

**Follow-up:**
What does the setter accept?

Answer: Either the next state value or a function that receives the previous state and returns the next one. Both must match the inferred state type.

### REACT-414 — A type argument on useState
**Difficulty:** Intermediate
**Category:** State
**Question:**
When do you pass a type argument to `useState`?

**Answer:**
Pass a type argument when the initial value does not show every type the state can hold. The common case is nothing yet, then data: `useState<User | null>(null)`. Without the argument, TypeScript infers `null` and rejects a later user. The same pattern covers `undefined`, an empty list, and a union such as `"idle" | "saving"`. Write the full union in the angle brackets and pass an initial value that belongs to it. The state type should be exactly the set of values the screen stores.

**Code:**
```tsx
const [user, setUser] = useState<User | null>(null);
```

**Follow-up:**
How do you type an empty list?

Answer: Write `useState<Item[]>([])`. An unannotated `[]` is an array that never accepts items, so the first `setItems` call fails.

### REACT-415 — Typing a functional state update
**Difficulty:** Intermediate
**Category:** State
**Question:**
How is the function form of a state setter typed?

**Answer:**
The setter from `useState` accepts the next value or an updater function. The updater goes from the previous state to the next state, both of the same type. If state is a number, the updater is `(prev: number) => number`. You use this form when the next value depends on the previous one, so a stale closure does not overwrite a newer click. TypeScript already knows `prev`, so you rarely annotate it. Keep the updater pure: it should compute the next state, not start a request.

**Follow-up:**
Can the updater return `null` if state is `number`?

Answer: Only if the state type includes `null`, for example `number | null`. Otherwise TypeScript rejects the return value.

### REACT-416 — A ref to a DOM node
**Difficulty:** Junior
**Category:** Refs
**Question:**
How do you type a ref that points at a DOM node?

**Answer:**
A DOM ref holds an element or `null`, because it is empty until React attaches the node. You write `useRef<HTMLInputElement>(null)` and pass that ref to the input. The type argument matches the tag, such as `HTMLInputElement` or `HTMLButtonElement`. After a null check, you can call methods such as `focus`. The `null` you pass is what makes the type include the empty case before the element exists. Skip that check and you will read a node that is not mounted yet.

**Code:**
```tsx
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus();
```

**Follow-up:**
What if the ref is forwarded to a custom component?

Answer: That component must be wrapped in `forwardRef`, and the ref type should match what it forwards, usually the underlying DOM element or a small handle object.

### REACT-417 — A ref as a mutable box
**Difficulty:** Intermediate
**Category:** Refs
**Question:**
How do you type a ref that stores a mutable value instead of a DOM node?

**Answer:**
`useRef` can also hold a mutable value that survives renders and does not, by itself, re-render when `.current` changes. For a number, `useRef(0)` is enough. For a box that starts empty, `useRef<number | null>(null)` keeps `.current` writable because `null` is part of the type. A DOM ref such as `useRef<HTMLInputElement>(null)` is different: React assigns the node, and the types make `.current` read-only. Use a mutable ref for timers and previous values, not for data the screen must show.

**Trade-offs:**
A mutable ref avoids extra renders, but nothing in the type system reminds you to update the screen. If the UI depends on the value, it belongs in state.

**Follow-up:**
Why does `useRef<HTMLDivElement>(null)` make `.current` read-only?

Answer: The `null` initializer selects the host-ref overload, so `.current` is read-only. For a writable box, include `null` in the type argument, as in `useRef<number | null>(null)`. Leave a real DOM ref read-only and let React assign the node.

### REACT-418 — Typed actions for useReducer
**Difficulty:** Senior
**Category:** Reducers
**Question:**
How do you type the actions a reducer can receive?

**Answer:**
Model each action as an object with a `type` field and only the payload that action needs, then join those objects in one union. A literal such as `type: "setName"` lets TypeScript narrow the payload inside the reducer. The reducer is a function from state and action back to state, and `useReducer` infers `dispatch` from that union. A caller who omits `name` gets an error. Named fields are clearer than a loose bag with an optional `payload`. Extend the union when you add an action, then handle it.

**Code:**
```tsx
type Action =
  | { type: "increment" }
  | { type: "setName"; name: string };
function reducer(state: State, action: Action): State {
  if (action.type === "setName") return { ...state, name: action.name };
  return { ...state, count: state.count + 1 };
}
```

**Follow-up:**
Should every action carry a generic `payload` field?

Answer: No. Put the data in named fields on that variant. A shared `payload` forces casts and hides which action owns which data.

### REACT-419 — The reducer function and dispatch
**Difficulty:** Senior
**Category:** Reducers
**Question:**
How do `useReducer` and `dispatch` pick up those action types?

**Answer:**
You pass a reducer whose second argument is your action union. `useReducer` returns state and a `dispatch` function that accepts only that union, so you rarely annotate `dispatch` yourself. If a child receives it, type the prop as `React.Dispatch<Action>`. The child then cannot invent an action the reducer does not handle. The reducer must return the same state type it received, so a branch that drops a field fails. Keep actions small. The type will not force that, but small actions stay easier to log.

**Follow-up:**
Can two reducers share one action union?

Answer: Yes, if they truly handle the same events. If their actions differ, give each its own union so a child cannot dispatch an action the parent does not understand.

### REACT-420 — Typing a context value
**Difficulty:** Intermediate
**Category:** Context
**Question:**
How do you type the value stored in React context?

**Answer:**
`createContext` needs the type of the value that providers will supply. If a real default exists, pass it, or write `createContext<AuthValue>(defaultAuth)`. The provider's `value` is checked against that type, and `useContext` returns it. Prefer a stable object of data plus the functions consumers call, rather than the whole parent state. A clear type stops a provider from omitting `signOut` or passing a string where a user belongs. Export that value type beside the context so callers do not rebuild it.

**Code:**
```tsx
type AuthValue = { user: User | null; signOut: () => void };
const AuthContext = createContext<AuthValue | null>(null);
```

**Follow-up:**
Why include the functions in the context type?

Answer: Consumers need to know what they can call. Typing `signOut` on the value makes a missing callback a compile error instead of a crash on click.

### REACT-421 — Context with no sensible default
**Difficulty:** Senior
**Category:** Context
**Question:**
How do you type a context that has no meaningful default value?

**Answer:**
Some contexts are meaningless outside their provider. A common pattern is `createContext<AuthValue | null>(null)`, then a hook that throws if the value is still `null`. After that check, the hook's return type is `AuthValue`, so callers do not test for `null` again. The `null` default exists only because `createContext` requires an initial argument. Throwing makes a missing provider obvious in development. Do not invent a dummy user just to avoid `null`. That fake default type-checks as if a real provider were mounted.

**Code:**
```tsx
function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}
```

**Follow-up:**
Could the default be `undefined` instead of `null`?

Answer: Yes. Pick one missing value and use it everywhere. Mixing `null` and `undefined` makes the guard harder to read and easier to get wrong.

### REACT-422 — Typing the provider's props
**Difficulty:** Senior
**Category:** Context
**Question:**
How do you type a custom provider component?

**Answer:**
A custom provider is a normal component. Its props usually include `children` and the inputs it needs to build the context value. Inside, you pass an object that matches the context type to the provider. If `useMemo` builds that object, its return type should be the context value, so a forgotten field fails there. Callbacks in the value must match the signatures you declared. Feature code then calls `useAuth` instead of importing the context object. The provider takes inputs, and the hook returns the ready value.

**Follow-up:**
Should the provider accept `value` from the outside?

Answer: Accept `value` only when a parent must supply it. If the provider loads or owns the data, take those inputs as props and keep the context value private.

### REACT-423 — Discriminated unions for UI state
**Difficulty:** Intermediate
**Category:** UI state
**Question:**
How do you type a screen that can be idle, loading, successful, or failed?

**Answer:**
A discriminated union is one object type per status, joined with `|`, and each object shares a literal `status` field. Loading has no user, success has a user, and error has a message. That is more honest than optional user and error fields plus a boolean, which allows impossible combinations. Store one whole variant in state, not a patchwork of flags. Each render branch then sees only the fields that exist for that status. Impossible screens cannot be represented, so they cannot be rendered by accident.

**Code:**
```tsx
type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; user: User }
  | { status: "error"; message: string };
```

**Follow-up:**
Where should this union live?

Answer: Next to the component if only one screen uses it. Export it from the feature module when a hook, a reducer, and a view all share the same states.

### REACT-424 — Narrowing a status union
**Difficulty:** Intermediate
**Category:** Narrowing
**Question:**
How does TypeScript narrow a UI state union while you render?

**Answer:**
Narrowing means TypeScript drops union members that a check has ruled out. After `if (state.status === "success")`, `state.user` is allowed and `state.message` is not. A switch on `state.status` does the same thing. The check has to use the shared literal field, the discriminant. Render each branch inside that narrowed block. The union then pays off, because the branch unlocks the data. You do not need a cast, and you do not optional-chain through a state that this branch has already made certain.

**Follow-up:**
Why does `state.user` fail before the check?

Answer: On the full union, `user` exists only on the success member. Until you narrow to that member, TypeScript will not pretend the other states have a user.

### REACT-425 — Exhaustive switches
**Difficulty:** Staff
**Category:** Narrowing
**Question:**
How do you make a reducer or a render switch fail when a new status is added?

**Answer:**
End the switch with a default that assigns the leftover value to `never`. If every variant was handled, nothing remains and the assignment is valid. If you add a status and forget a branch, that leftover type is not `never`, so the compiler errors. A small `assertNever` helper can hold the check and throw if bad data slips through at runtime. Use it in reducers and in render switches. A new state then cannot fall through to a blank screen without a type error next to the switch.

**Code:**
```tsx
default: {
  const _exhaustive: never = action;
  return _exhaustive;
}
```

**Follow-up:**
What if the data comes from the network and might be a new status string?

Answer: Validate it at the boundary into your union, and keep the `never` check on the trusted value. The compiler cannot exhaust a plain `string`.

### REACT-426 — The satisfies operator
**Difficulty:** Senior
**Category:** Type operators
**Question:**
What does `satisfies` do for a props object or a theme?

**Answer:**
`satisfies` checks that a value matches a type while keeping the narrower type of the value itself. You write `const theme = { primary: "#036" } satisfies Theme`. TypeScript errors if a field is missing, but it still remembers the exact color string instead of widening it to `string`. A plain annotation such as `const theme: Theme` checks the shape and then widens the fields. Use `satisfies` for tokens, route maps, and component registries. You get the contract check without losing the precise literals, and the runtime value does not change.

**Follow-up:**
Can you use `satisfies` on JSX props?

Answer: You usually do not. JSX already checks props against the component. `satisfies` is for objects you build in TypeScript and want to verify without widening.

### REACT-427 — satisfies versus a type assertion
**Difficulty:** Senior
**Category:** Type operators
**Question:**
Why is `satisfies` safer than `as` for a component's config object?

**Answer:**
A type assertion, written with `as`, tells TypeScript to treat a value as a type and skips most checking. A missing key can still compile. `satisfies` does the opposite: it checks the object against the type, then keeps the inferred type. Use `as` only when you know more than the compiler, such as after a parse you trust. Use `satisfies` when the object should prove it matches the contract. In a component map, a false assertion crashes on first render. A failed `satisfies` check is an error beside the bad field.

**Trade-offs:**
`as` is shorter when you are bridging untyped data, but it hides mistakes. `satisfies` cannot describe a value that is intentionally wider than its inferred literal type; an annotation is clearer there.

**Follow-up:**
Does `satisfies` replace an annotation on a function?

Answer: No. Use a return type or parameter types on functions. `satisfies` is for values, especially object literals you want checked and precisely inferred.

### REACT-428 — strictNullChecks and missing data
**Difficulty:** Junior
**Category:** Nullability
**Question:**
What does `strictNullChecks` change in a React component?

**Answer:**
With `strictNullChecks`, `null` and `undefined` are not treated as every other type. A value of `User | null` cannot be passed where `User` is required until you narrow it. That shows up when data has not loaded, a ref is empty, or a prop is optional. Narrow with an early return or a branch that renders a placeholder. Optional chaining reads through a missing value. It does not prove the value exists. Turn the flag on early, so every screen has to decide what it shows while data is still missing.

**Follow-up:**
Is `user && <Profile user={user} />` enough to narrow?

Answer: Yes, in that expression TypeScript narrows `user` inside the right-hand side. A boolean `user` is a bad model; prefer `user !== null` when the value could be a valid empty object.

### REACT-429 — null versus undefined in state
**Difficulty:** Junior
**Category:** Nullability
**Question:**
How should you choose between `null` and `undefined` in component state?

**Answer:**
`undefined` often means the caller omitted a value. `null` often means you looked and there is nothing, such as a signed-out user. Pick one empty case for each piece of state and write it into the type. `useState<User | null>(null)` is a clear empty start. Optional props already include `undefined`, because the caller may leave them out. Mixing `null` and `undefined` in one field forces every reader to check twice. Choose the absence your UI actually means, and use that one consistently.

**Follow-up:**
What does JSON parsing do to this choice?

Answer: JSON has `null` and has no `undefined`. If the value crosses the network, `null` usually matches the payload, and `undefined` means the field was omitted before you sent it.

### REACT-430 — The non-null assertion
**Difficulty:** Senior
**Category:** Nullability
**Question:**
Why is the `!` non-null assertion risky in React code?

**Answer:**
The `!` in `user!.name` tells TypeScript that `user` is not null or undefined, and the compiler stops checking. If the request is still in flight, that render throws. The same trap appears when you read a ref during the first render, before React has attached the node. Use `!` only when a condition outside the types already guarantees the value, and keep that spot small. Prefer an early return or a fallback. The assertion removes the error that would have forced a real empty state.

**Follow-up:**
Is `!` acceptable in a test?

Answer: Sometimes, right after a query you know succeeded. In application components, a visible null check is safer because render order is easy to get wrong.

### REACT-431 — Excess property checks
**Difficulty:** Intermediate
**Category:** Props
**Question:**
What is an excess property check on a component call?

**Answer:**
When a fresh object literal is passed where a specific type is expected, TypeScript warns about extra fields. JSX props get the same check. `<UserCard name="Ada" unknown="x" />` fails when `UserCard` has no `unknown` prop. The warning catches typos such as `class` instead of `className`, and props left over from a copy. It applies to literals you write at the call, not to a variable that already has a wider type. Hand-written call sites stay honest, while a prebuilt object can still carry extra fields.

**Follow-up:**
Why does a typed variable sometimes allow an extra field the JSX literal rejects?

Answer: Excess property checks run on fresh literals. A variable is checked only for compatibility, and extra fields are allowed when the variable's type is a wider object.

### REACT-432 — Spreads and excess property checks
**Difficulty:** Staff
**Category:** Props
**Question:**
Why can a prop spread bypass excess property checks?

**Answer:**
Excess property checks look at a fresh literal written at the call. A spread already has a type, so TypeScript asks only whether that type can be assigned. `<UserCard {...data} />` can type-check when `data` has the required props plus extra fields. Those extras may reach a DOM node, or they may be ignored. Avoid spreading an untrusted object onto a DOM element. Spread a known props type, or list the fields you mean to pass. In a wrapper, take your own props out before you spread the rest.

**Trade-offs:**
Spreading keeps wrappers short, but it weakens the typo check and can forward sensitive or invalid DOM attributes. Explicit props are louder and safer at a public boundary.

**Follow-up:**
How do you remove your wrapper's own props before spreading onto a `div`?

Answer: Destructure them out, then spread the rest: `function Box({ title, ...rest }: BoxProps)`. Type `rest` so it matches the `div` attributes you really allow.

### REACT-433 — A generic list component
**Difficulty:** Intermediate
**Category:** Generics
**Question:**
How do you type a list component that works for any item type?

**Answer:**
A generic list takes a type parameter for each item. The `items` prop is an array of that parameter, and `renderItem` receives one item of the same type. Callers do not pass the parameter by hand. TypeScript infers it from the array, so a list of users types the callback with a user. That is safer than `unknown[]` plus a cast. Constrain the parameter only when the list needs something from the item, such as an id for the row key. Leave it open when any item will do.

**Code:**
```tsx
type ListProps<T> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
};
function List<T>({ items, renderItem }: ListProps<T>) {
  return <>{items.map((item) => renderItem(item))}</>;
}
```

**Follow-up:**
Why might inference fail if `items` is empty?

Answer: An empty array literal is `never[]` until a type is known. Pass `<Item>` on the component or type the array as `Item[]` so `renderItem` still sees `Item`.

### REACT-434 — Constraining the generic
**Difficulty:** Senior
**Category:** Generics
**Question:**
How do you constrain a generic component without ruining inference?

**Answer:**
A constraint says what a type parameter must include. `T extends { id: string }` means every item has an id, so the list can build row keys without a cast. Callers still infer the full item type when that parameter appears on a value they pass, usually the `items` array. Inference gets worse if the parameter shows up only in the return type. Put the data prop where TypeScript can read it. Constrain the smallest capability the component uses, not the entire item shape, or reuse gets blocked.

**Follow-up:**
What happens if you default `T` to `unknown`?

Answer: Callers may stop inferring a useful item type and fall back to `unknown`. Prefer a real constraint and let the items array drive inference.

### REACT-435 — A light polymorphic component
**Difficulty:** Staff
**Category:** Polymorphism
**Question:**
How do you type a component that can render as a `button` or an `a`?

**Answer:**
A polymorphic component takes an `as` prop that names the element to render, and the rest of the props should match that element. A light version is a union of two cases: a button with button attributes, or an anchor with anchor attributes and a required `href`. Two or three tags stay readable. A fully generic `as` that accepts any component is more flexible and much harder to type. Prefer the small union until a design system really needs arbitrary tags. The call site should demand `href` only for the link.

**Trade-offs:**
A two-variant union is easy to review and hard to extend to every HTML tag. A generic polymorphic type scales further but is difficult to debug when inference fails.

**Follow-up:**
Where should the union be enforced?

Answer: On the component's props, so the error appears at the call site. Inside the component, narrow on `as` before you render the tag.

### REACT-436 — Typing a render prop
**Difficulty:** Senior
**Category:** Patterns
**Question:**
How do you type a render prop?

**Answer:**
A render prop is a function you pass in, which the component calls to render part of the UI. Type that field as a function from the data you promise to the kind of node React can render. The caller then writes the function inline and gets a typed argument. Use the name `children` only when that function is the whole API. Otherwise a prop named `render` is easier to scan. Avoid typing it as `Function`, which erases both the argument and the return value. If it is optional, call it only after a check.

**Code:**
```tsx
type Props = { user: User; render: (user: User) => React.ReactNode };
function Profile({ user, render }: Props) {
  return <section>{render(user)}</section>;
}
```

**Follow-up:**
How is this different from a generic list's `renderItem`?

Answer: Same idea, smaller scope. `renderItem` is a render prop whose argument is tied to the list's item type parameter.

### REACT-437 — Typing a higher-order component
**Difficulty:** Staff
**Category:** Patterns
**Question:**
How do you type a higher-order component that injects a prop?

**Answer:**
A higher-order component takes a component and returns a component. If `withUser` injects a user, the inner props include that user and the outer props leave it out, often with `Omit`. The caller then renders the result without passing `user` again. `ComponentType`, `Omit`, and refs are easy to get wrong, which is why hooks replaced most of these wrappers. If you still need one, type the injected prop, remove it from the public props, and check a real call site. An `any` wrapper compiles and then misleads every consumer.

**Trade-offs:**
An HOC can wrap many components once. A hook is usually easier to type and to read. Prefer the hook unless you must alter a component from the outside.

**Follow-up:**
What is `ComponentType`?

Answer: It is `ComponentClass<P> | FunctionComponent<P>`, a component that accepts props `P`. Use it when the wrapper should accept both functions and classes.

### REACT-438 — forwardRef and TypeScript
**Difficulty:** Senior
**Category:** Refs
**Question:**
How do you type `forwardRef`?

**Answer:**
`forwardRef` lets a parent pass a ref through to an inner DOM node or a small handle. Its type arguments are the ref type first and the props second, as in `forwardRef<HTMLInputElement, InputProps>`. You attach that ref to the real input. If the parent should only call `focus`, type a handle with that method and set it in `useImperativeHandle`. Do not type the ref as `any`. Keep `ref` out of the props type, because `forwardRef` adds it. Without the type arguments, the parent's ref often stops matching the element.

**Code:**
```tsx
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return <input ref={ref} {...props} />;
});
```

**Follow-up:**
Why is the ref type argument first?

Answer: That is `forwardRef`'s type-parameter order: ref, then props. Swapping them makes the props look like an element and the errors get confusing fast.

### REACT-439 — ComponentProps helpers
**Difficulty:** Intermediate
**Category:** Props
**Question:**
How do `ComponentProps` and `ComponentPropsWithoutRef` help?

**Answer:**
`React.ComponentProps<"button">` is the props a button accepts, including `onClick`, `disabled`, and `children`. `ComponentProps<typeof Button>` does the same for your own component. `ComponentPropsWithoutRef` is that set minus `ref`, which you want when you are building a wrapper that will attach its own ref or when `ref` is added by `forwardRef`. These helpers keep wrappers in sync with the underlying element so you do not copy a long prop list by hand. Intersect them with your extra fields, and omit keys you replace. They describe props, not behavior. You still decide which native props you are willing to forward.

**Follow-up:**
When would you use `ComponentPropsWithRef`?

Answer: When the wrapper should expose the same ref the underlying component exposes. Use the `WithoutRef` form when your component's ref means something else.

### REACT-440 — Inferring a type from a schema
**Difficulty:** Senior
**Category:** Validation
**Question:**
How do libraries like Zod or io-ts connect a schema to a TypeScript type?

**Answer:**
A schema describes a value at runtime: which fields exist, and what happens when the payload is wrong. Zod and io-ts can infer a TypeScript type from that schema, so the shape is written once. You parse untrusted input with the schema, and only the success path has the inferred type. The type by itself never looks at JSON. In a React app, parse in the loader or the submit handler, then pass the named type into components. Those components can treat the fields as real because the boundary already checked them.

**Follow-up:**
Do you have to annotate component props with `z.infer` everywhere?

Answer: Infer once, name the type `User`, and use `User` in props. Components should depend on the named type, not on the schema helper.

### REACT-441 — A schema is not a type
**Difficulty:** Staff
**Category:** Validation
**Question:**
Why is a TypeScript type not enough for API data in a React app?

**Answer:**
A TypeScript type is removed when the program is compiled. It never inspects the bytes from `fetch`. Writing `as User` on `res.json()` is an assertion, so a missing field still type-checks. A schema actually parses the value and gives you a failure branch you can render. After success, the inferred type matches what the parser accepted, and component props stay honest. Use a plain type for data your own code created. Use a schema for the network, storage, or a submitted form, then pass the trusted object down.

**Trade-offs:**
Schemas add a dependency and a parse step. Assertions are shorter and give you a false sense that the server contract is already enforced.

**Follow-up:**
Where should the parse happen relative to the component?

Answer: At the edge that received the data: a loader, a query function, or the submit handler. Pass the parsed value down so leaves do not each parse again.

### REACT-442 — @types packages
**Difficulty:** Intermediate
**Category:** Libraries
**Question:**
What is an `@types` package, and when does a React app need one?

**Answer:**
TypeScript can check a library only when something declares its exports. Many packages ship those declarations. Older packages rely on DefinitelyTyped, which publishes them under the `@types` scope. Install `@types/react` and `@types/react-dom` so JSX and hooks are typed. Skip `@types/foo` when `foo` already contains its own `.d.ts` files, because the two copies can disagree. Match `@types/react` to your React major version. React 18 changed details such as whether `FC` includes children. Community types can lag the library, so treat a mismatch as a dependency issue, not as a bug in your component.

**Follow-up:**
What if no `@types` package exists?

Answer: Write a small module declaration for the imports you use, or contribute types upstream. An `any` import hides every misuse of that library.

### REACT-443 — Types that ship with the library
**Difficulty:** Intermediate
**Category:** Libraries
**Question:**
How can you tell that a library ships its own types?

**Answer:**
Open `package.json` and look for a `types` or `typings` field, or look for `.d.ts` files next to the entry point. If those exist, TypeScript reads them and you should not add an `@types` package of the same name. Libraries written in TypeScript usually emit the declarations during their build. Upgrading the library upgrades those types, which is why a major bump can suddenly fail JSX that used to compile. Prefer packages that ship types and export the prop types your wrappers need. A second, hand-maintained type package tends to drift.

**Follow-up:**
What does `skipLibCheck` change here?

Answer: It skips checking inside declaration files, which can hide library bugs and also hide conflicts. Leave it off until a dependency's types are genuinely broken and blocking the build.

### REACT-444 — Optional callbacks
**Difficulty:** Intermediate
**Category:** Props
**Question:**
How do you type an optional event callback on your component?

**Answer:**
Type an optional callback as a specific function, such as `onSave?: (draft: Draft) => void`. Inside the component, call it only when it was passed, for example with `onSave?.(draft)`. The question mark means the parent may omit the prop. It does not mean the argument can be anything. Keep the parameters concrete so an inline function infers them. Return `void` unless you actually use the result. If the component makes no sense without the handler, drop the question mark so a missing callback is a compile error instead of a silent click.

**Code:**
```tsx
type Props = { draft: Draft; onSave?: (draft: Draft) => void };
function Editor({ draft, onSave }: Props) {
  return <button onClick={() => onSave?.(draft)}>Save</button>;
}
```

**Follow-up:**
Should a click handler be `() => void` or receive the event?

Answer: Pass the event only when the parent needs it. If your component already decided what the click means, pass the domain value and keep the DOM event inside.

### REACT-445 — Mutually exclusive props
**Difficulty:** Senior
**Category:** Props
**Question:**
How do you type props that cannot be combined, such as `href` together with `onClick` for two different kinds of control?

**Answer:**
Use a union of object types, with one member for each valid combination. A link member has a `kind` of `"link"` and a required `href`. A button member has a `kind` of `"button"` and a required `onClick`. Shared fields such as `label` go on both members. TypeScript then rejects a call that sets `href` and `onClick` together. One interface full of optional fields would allow that mix. The pattern stays readable for two or three modes. Past that, smaller components are easier to explain than a long union.

**Code:**
```tsx
type ControlProps =
  | { kind: "link"; href: string; label: string }
  | { kind: "button"; onClick: () => void; label: string };
```

**Follow-up:**
Can you omit `kind` and still tell the variants apart?

Answer: Sometimes, if one side has `href: string` and the other omits `href`. A shared literal such as `kind` is easier to narrow and produces clearer errors.

### REACT-446 — Variant components
**Difficulty:** Staff
**Category:** Props
**Question:**
How do you design the types for a component with visual variants?

**Answer:**
Decide which combinations are real before you write the props type. If every size works with every tone, two string unions on one interface are enough. If some pairs are illegal, list only the legal ones in a discriminated union so the bad pair does not compile. Prefer `variant: "primary" | "ghost"` once you have more than a boolean. Two flags can both be true, and the screen then has no single meaning. Export the union so styles and tests use the same names. Removing a variant should light up every call that still uses the old name.

**Follow-up:**
How do you share those literals with a style map?

Answer: Type the map as `Record<Variant, string>` so a new variant fails until a style exists. `satisfies` works too if you need the precise keys preserved.

### REACT-447 — Server Components and the checker
**Difficulty:** Senior
**Category:** Server Components
**Question:**
What does TypeScript check for a React Server Component?

**Answer:**
A Server Component is still a function that returns JSX, so TypeScript checks its props and return value like any other component. The types do not fully police where the function runs. These components may be async and may read server-only data, and they should not call state or effect hooks. The compiler will not, by itself, ban `useState` in a server file. The bundler and your lint rules carry that job. Types still matter on the boundary: what you pass to a client child must match that child's props.

**Follow-up:**
Does `"use server"` annotate a type?

Answer: No. Directives are strings the bundler reads. TypeScript checks the function like any other function unless a lint rule or a helper type adds a constraint.

### REACT-448 — Async Server Components
**Difficulty:** Staff
**Category:** Server Components
**Question:**
How do you type an async Server Component?

**Answer:**
An async Server Component is an async function whose result is JSX. Type its props the same way you type any other component. The return type is a promise of UI, which the `async` keyword already implies. Parents usually render it as an element under Suspense, rather than awaiting a promise by hand. The important annotation is the data you load inside. Parse that result before you pass it on. Do not wrap the component in `React.FC`, which describes a sync function. Keep a database handle, or any other server-only value, out of client props.

**Code:**
```tsx
async function UserPage({ id }: { id: string }) {
  const user = await loadUser(id);
  return <h1>{user.name}</h1>;
}
```

**Follow-up:**
Can a client component be async?

Answer: No. Client components render on the client and use state for async work. Only Server Components use the async function form.

### REACT-449 — Props that cross to a client component
**Difficulty:** Staff
**Category:** Server Components
**Question:**
What should TypeScript reflect about props passed from a Server Component to a client component?

**Answer:**
Props passed to a client component are serialized. Strings, numbers, plain objects, and arrays can cross that boundary. Ordinary functions, class instances, and other server-only values cannot, except for cases the framework explicitly supports, such as a Server Action. TypeScript's normal props check does not measure whether a value can be serialized. You still type the client props as the plain data the component needs, and you leave server objects out of that type. A user made of plain fields is a sound boundary. A class with methods is not.

**Trade-offs:**
Plain data props are easy to type and safe to send. Passing callbacks feels natural in client React and breaks or changes meaning at the server boundary unless the callback is a Server Action.

**Follow-up:**
How do you pass a click handler to a client button?

Answer: Define the client component on the client side of the boundary and close over the handler there. Pass only the data it needs from the server.

### REACT-450 — The client boundary and children
**Difficulty:** Staff
**Category:** Server Components
**Question:**
How do types interact with the `"use client"` boundary and with children?

**Answer:**
`"use client"` marks a module that runs on the client. Props on those components are the contract a parent must satisfy. A Server Component may pass plain data, and it may pass `children` typed as `React.ReactNode`, because those children are elements the server already rendered. It should not pass an ordinary function as a callback and expect the types to make that legal. Keep the boundary small. Server parents fetch and compose. Client leaves handle interaction. When the exported props are plain data plus children, that contract stays easy to explain.

**Follow-up:**
Why can `children` cross the boundary when a custom function prop cannot?

Answer: `children` is a rendered node the server already produced. A custom function would need to run later on the client, and a normal function is not serialized with the props.

