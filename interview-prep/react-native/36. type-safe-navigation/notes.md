# Type-safe navigation (TypeScript)

## What you need to know

[Nested architecture](../34.%20nested-nav-architecture/notes.md) made **names and nesting** real. This unit is how TypeScript **makes those names and params compile-time**, so `navigate('Tyop')` and `route.params.id` as `any` **don’t ship**.

**Learn:**

- **Param lists** per navigator
- **Composite** types for **nested** navigators
- `NativeStackScreenProps` / `BottomTabScreenProps`
- Avoiding **`any`** on `route.params`
- Central **route name constants**

**Why interviewers care (preserve):** production discipline; fewer **runtime** route bugs.

**Be ready to explain (preserve):**

- How params are **declared**
- How a screen **reads** typed params
- How **nested** navigators complicate typing and how you **handle** it

**What belongs in params** (ids vs API objects) is **next**. Types **don’t** make a fat `user` object a good param.

---

## Param lists — declaring params

A **param list** is a TypeScript map: **route name → params type**. **`undefined`** means **no params**. One list **per navigator**, matching that navigator’s **`<Stack.Screen name>`**.

```ts
export type HomeStackParamList = {
  Home: undefined;
  TxDetails: { id: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();
```

**How it works:** the generic on `createNativeStackNavigator<ParamList>()` types:

- `navigate('TxDetails', { id })` — **wrong name** / **missing `id`** is a **type error**
- `navigate('Home', { id })` — Home is **`undefined`** → extra params **error** (v6+ strictness)

**Practical:** files like `features/wallet/navigation/types.ts` (or `shared/navigation/types.ts` for Root). The list is the **source of truth** for that stack.

**`NavigatorScreenParams`:** a **tab/root** entry that **is** a nested navigator:

```ts
export type AppTabParamList = {
  HomeStack: NavigatorScreenParams<HomeStackParamList>;
  WalletStack: NavigatorScreenParams<WalletStackParamList>;
  PaymentsStack: NavigatorScreenParams<PaymentsStackParamList>;
};
```

That is what types **tab-first nested navigate**:

```ts
navigation.navigate('WalletStack', {
  screen: 'TxDetails',
  params: { id },
});
```

Without `NavigatorScreenParams`, TypeScript **cannot** check the **nested** `screen` / `params`.

---

## How a screen reads typed params

**`NativeStackScreenProps<ParamList, RouteName>`** (and **`BottomTabScreenProps`**) wire **`route` + `navigation`** for **that** screen.

```ts
type Props = NativeStackScreenProps<HomeStackParamList, 'TxDetails'>;

function TxDetailsScreen({ route, navigation }: Props) {
  const { id } = route.params; // string
  navigation.navigate('Home');  // ok
  // navigation.navigate('Confirm'); // error unless Confirm is on THIS list
}
```

**`useRoute()` / `useNavigation()`** need the **same** generics (or the **global** `RootParamList` merge below). Bare `useRoute().params` is often **`Readonly<object | undefined>`** — people then write **`as any`**. That’s the bug.

```ts
const route = useRoute<RouteProp<HomeStackParamList, 'TxDetails'>>();
const { id } = route.params;
```

**Never:** `const id = (route.params as any).id`. If params might be **undefined** (optional keys, deep link **partial**), type them **`id?: string`** and **narrow** — don’t `any`.

---

## Nested navigators: composite types

A screen in **HomeStack** that must **`navigate` to a sibling tab** or a **root modal** is **not** fully described by `HomeStackParamList` alone. `NativeStackScreenProps<HomeStackParamList, 'Home'>` only knows **Home / TxDetails**.

**`CompositeScreenProps`:** this screen’s navigator **plus** a **parent**.

```ts
type HomeProps = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'Home'>,
  CompositeScreenProps<
    BottomTabScreenProps<AppTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;
```

**Mental model:** **innermost first** (this stack), then **tabs**, then **root**. That’s how `navigation.navigate('WalletStack', { screen: 'TxDetails', params: { id } })` and `navigation.navigate('Receipt', { transferId })` type-check from Home.

**Without composite:** you **`as never`** / **`as any`** on `navigate` for cross-tab — **runtime** `action not handled` stays possible; you’ve only **silenced** TS.

**Global merge** (optional convenience for `useNavigation()` without props):

```ts
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

This types **untyped** `useNavigation()` against **root**. It does **not** replace **per-navigator lists**. Nested payloads still need **`NavigatorScreenParams`** on Root/Tabs.

---

## Central route name constants

Param list keys **are** the names. Still extract constants so **linking**, **notifications**, and **analytics** don’t **string-duplicate**:

```ts
export const ROUTES = {
  Home: 'Home',
  TxDetails: 'TxDetails',
  Receipt: 'Receipt',
} as const;

type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
```

**Keep them aligned** with ParamList keys (`satisfies` / `keyof ParamList`). A constant **`'TxDetail'`** that **isn’t** in the list is how you get **runtime** not-handled **and** a **false sense** of safety.

**Don’t** use constants as an excuse to type `navigate(string)`. Pass **`typeof ROUTES.TxDetails`** so it stays a **literal**.

---

## Common mistakes and misconceptions

- **`any` on `route.params`** “just this screen.”
- **One giant ParamList** for the whole app **without** `NavigatorScreenParams` — nested `screen` **untyped**.
- Typing **only** the stack you **see**, then **unsafe** cross-tab `navigate`.
- **Duplicate** route **string** in linking vs ParamList (**typo**).
- **`Home: {}`** vs **`undefined`** — empty object still **allows** `{}`; `undefined` means **no** params.
- Thinking types **fix** [action not handled](../34.%20nested-nav-architecture/notes.md) — they **don’t** if you **cast**.
- Putting **tokens** or **full `User`** in the ParamList because “it’s typed” — **next** section.

---

## Connections to other concepts

`ParamList per navigator → ScreenProps / composite for parents → nested navigate typed → constants = same literals`

- **[Nested nav](../34.%20nested-nav-architecture/notes.md):** tab-then-screen **payload** is what `NavigatorScreenParams` **describes**.
- **[Building blocks](../33.%20nav-building-blocks/notes.md):** `useNavigation` is **nearest** — composite is how TS **widens** to **parents**.
- **[Derived-state](../32.%20derived-state/notes.md):** typed `id` still **not** a copied **profile**.
- Next: **params vs fetch** — **what** you put in those typed fields.
- Later: **linking** `config` must **match** these names.

---

## Interview perspective

They want **declare / read / nested**. Discipline, not a TS puzzle.

Spoken (30–60s):

> I keep a ParamList per navigator and pass it to createNativeStackNavigator. Screens use NativeStackScreenProps — or CompositeScreenProps when they navigate into a parent tab or root modal — so route.params and navigate are typed and I never any the params. Nested navigators use NavigatorScreenParams so tab-then-screen payloads type-check. Route names live in one module so linking and notifications can’t drift.

Follow-up: **why composite** — child list **doesn’t** include **WalletStack**.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
