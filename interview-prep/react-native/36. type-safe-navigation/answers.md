# Type-safe navigation — Answers

## Core recall

1. A TS map **route name → params**. **`undefined`** = **no params**.
2. **Production discipline; fewer runtime route bugs.**
3. `type HomeStackParamList = { TxDetails: { id: string }; … }`; `createNativeStackNavigator<HomeStackParamList>()`.
4. `NativeStackScreenProps<HomeStackParamList, 'TxDetails'>` → `route.params.id` is **`string`**.
5. **Stack** screen props vs **tab** screen props — `navigation`/`route` typed for **that** navigator kind.
6. **Nested navigator** params: `{ screen, params }` for the **child** list.
7. A screen that **navigates on a parent** (tabs/root), not only its own stack.
8. **Silences** missing/wrong params; **deep links** and **typos** become **runtime**.
9. **One literal** for linking, notifications, analytics — **aligned** with ParamList keys.
10. **ParamList per navigator; ScreenProps or Composite for parents; no any; NavigatorScreenParams for nested payloads; names in one module.**

## Explain why

1. Each navigator **owns** a **different** child set. One blob **lies** about who can `navigate` where.
2. `navigate`’s first arg is **`keyof ParamList`**.
3. Home’s list **doesn’t include** `WalletStack`. That’s a **tab** route.
4. **This screen’s** `navigation` is the stack; **parents** added **outward** — matches **bubble** + nested payload.
5. Default params type is **too wide**; the escape is **`as any`**.
6. Tabs don’t list **TxDetails**; they list **WalletStack**. Nested fields need the **child** ParamList.
7. You can **`as never`**. The **tab navigator** still must **declare** the name.
8. `string` **widens**; `navigate(randomString)` **compiles**.
9. `{}` is an **object type** (often **allows** `{}`). **`undefined`** = **don’t pass a params object**.
10. Types check **shape**, not **freshness / PII**. **Fetch by id** is next.

## Compare and contrast

1. **Shape of params** vs **stable name literals** used **outside** `navigate`.
2. **This navigator only** vs **this + parents**.
3. **Nested payload** vs **wrongly flattening** leaves onto tabs (types **and** runtime **lie**).
4. Convenient **`useNavigation()`** vs **explicit** screen props (still need **child lists**).
5. **Named** params vs **unchecked** access.
6. Nested unit = **how dispatch finds** a screen. This = **TS model of that payload**.
7. **How** to type vs **what** to store in params.
8. **Wrong name in this ParamList** vs **right types, wrong navigator** (or **cast**).

## Predict the output

1. **Type error** — `id` **required**.
2. **TS error** (nested `screen` not in type). Runtime: might **switch tab** and **ignore** nested, or **not handled**, depending on RN version — **don’t** rely on it; **fix the type**.
3. **Type error** (Receipt not on Home list) unless you **cast**.
4. **`id` undefined** → crash on use. **`any` hid** the optional/missing case.
5. **Compiles** (`string`); runtime **not handled** / wrong screen.
6. **Root** `navigate` may type **top-level** names; **nested `{ screen, params }`** still needs **`NavigatorScreenParams`** on those keys. Merge **alone** doesn’t invent nested typing.

## Debugging

1. **ParamList + `NativeStackScreenProps<List, Name>`** (or composite). **No `route: any`.**
2. **Cast hid** that Confirm isn’t on Home. **Runtime:** target **PaymentsStack** then Confirm; **type** with composite + `NavigatorScreenParams`.
3. **Name drift** — link **doesn’t** map; **constants/ParamList** must match.
4. Add **`BottomTabScreenProps<AppTabParamList>`** in the composite chain.
5. Type **`{ id: string }`** (required) or **narrow** `if (!id)`. Don’t `string | undefined` **and** pretend.
6. **Two lists** (`HomeStackParamList` vs `WalletStackParamList`) even if the **component** is reused. **Don’t** share a list that **lies**.

## Application

1. Declare per navigator; ScreenProps; composite + NavigatorScreenParams; no any; ROUTES aligned.
2. `TxDetails: { id: string }`; `type Props = NativeStackScreenProps<HomeStackParamList, 'TxDetails'>`.
3. `HomeStack/WalletStack/PaymentsStack: NavigatorScreenParams<…List>`.
4. `CompositeScreenProps<NativeStackScreenProps<HomeStackParamList, 'Home'>, CompositeScreenProps<BottomTabScreenProps<AppTabParamList>, NativeStackScreenProps<RootStackParamList>>>`.
5. **…use `any` on `route.params` or untyped `navigate` for cross-tree jumps.**
6. `satisfies Record<…> ` / `ROUTES.TxDetails satisfies keyof HomeStackParamList`.

## Interview questions

1. **Spoken:** ParamList per navigator on `createNativeStackNavigator`. Screens take **`NativeStackScreenProps<List, 'TxDetails'>`**; `route.params` is typed.  
   **Follow-up:** Same generic on **`useRoute`**, or **props**. **No `any`.**

2. **Spoken:** Child list doesn’t include **tabs/root**. **`NavigatorScreenParams`** on parent entries; **`CompositeScreenProps`** so `navigate` can see **parents**.

3. **Spoken:** Hides missing params and typos. Deep links and notifications **will** omit fields.

4. **Spoken:** ScreenProps = **this** stack/tab. Composite = **this + parent** navigators.

5. **Spoken:** **`ROUTES` as const** aligned with **`keyof ParamList`**. Linking/notifications import **those**, not raw strings.

## Connections

1. `WalletStack: NavigatorScreenParams<WalletStackParamList>` **is** the type of **tab first, then screen**.
2. Props default to **this** navigator. Composite **adds** parent `navigate` overloads.
3. Auth xor is **runtime trees**. Types don’t **mount** Auth. Don’t type `navigate('Home')` as the **login API**.
4. Param object **won’t update** when RQ refetches. **Id + fetch**.
5. Linking `screens` keys **must equal** ParamList **names** or links **miss**.
