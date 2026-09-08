# Type-safe navigation — Self-test

## Core recall

1. What is a **param list**? What does **`undefined`** mean as a value type?
2. Recite why interviewers care (one sentence).
3. How do you **declare** params for `TxDetails: { id: string }` and attach them to a stack?
4. How does a screen **read** typed params (`NativeStackScreenProps`)?
5. What are `NativeStackScreenProps` vs `BottomTabScreenProps` for?
6. What does **`NavigatorScreenParams<ChildList>`** type?
7. What problem does **`CompositeScreenProps`** solve?
8. Why is `route.params as any` a production smell?
9. What are **route name constants** for if ParamList already has keys?
10. Recite the spoken 30–60s typing answer.

## Explain why

1. Why **one ParamList per navigator**, not one blob of every screen?
2. Why does `createNativeStackNavigator<ParamList>()` make `navigate('Tyop')` fail at **compile** time?
3. Why isn’t `NativeStackScreenProps<HomeStackParamList, 'Home'>` enough to type `navigate('WalletStack', …)`?
4. Why composite is **innermost stack first**, then tabs, then root?
5. Why `useRoute()` without a generic pushes people toward `any`?
6. Why `NavigatorScreenParams` is required for **tab-then-screen** payloads?
7. Why types **don’t** replace targeting the right nested navigator at **runtime**?
8. Why constants must stay **`as const` / `keyof ParamList`**, not `string`?
9. Why `Home: undefined` vs `Home: {}`?
10. Why a typed `{ user: User }` in the list is still the **wrong** design (preview of next unit)?

## Compare and contrast

1. ParamList vs `ROUTES` constants.
2. `NativeStackScreenProps` vs `CompositeScreenProps`.
3. `NavigatorScreenParams` vs listing leaf screens on the **tab** ParamList.
4. Global `RootParamList` merge vs per-screen props.
5. `RouteProp<List, 'TxDetails'>` vs `as any` on params.
6. This unit vs [nested navigate](../34.%20nested-nav-architecture/notes.md).
7. This unit vs next section (typed fields vs **what** to put in them).
8. Compile-time `navigate` error vs runtime **`action not handled`**.

## Predict the output

1. `HomeStackParamList` has `TxDetails: { id: string }`. `navigate('TxDetails')` with no second arg. TS?

2. `navigate('WalletStack', { screen: 'TxDetails', params: { id: '1' } })` but `AppTabParamList` has `WalletStack: undefined`. TS? Runtime?

3. Screen typed only with `NativeStackScreenProps<HomeStackParamList, 'Home'>`. You `navigate('Receipt')` (root modal). TS?

4. `const { id } = useRoute().params as any`. Deep link omits `id`. Runtime?

5. `ROUTES.TxDetails = 'TxDetail'` (typo) while ParamList has `'TxDetails'`. `navigate(ROUTES.TxDetails)` if typed as `string`?

6. Global `RootParamList` merge only; Home uses `useNavigation()` and `navigate('TxDetails', { id })`. Nested under tabs — does this **always** type-check nested payloads?

## Debugging

1. Review: every screen `({ route }: { route: any })`. What do you require?

2. `action not handled` for `Confirm` from Home; TS **didn’t** error because of `as never`. Diagnose both layers.

3. Linking path uses `'TransferDetail'`; ParamList has `TransferDetails`. Symptom class?

4. Composite **omits** `BottomTabScreenProps`. Cross-tab navigate from Home: TS error. What’s missing?

5. `TxDetails: { id: string | undefined }` and the screen does `id.toUpperCase()` with no check. What’s the real fix?

6. Two stacks both have `'TxDetails'` with **different** param shapes. One ParamList reused for both navigators. What’s wrong?

## Application

1. Recite: declare, read, nested (composite + NavigatorScreenParams), no `any`, constants.

2. Write `HomeStackParamList` + `NativeStackScreenProps` for `TxDetails`.

3. Write `AppTabParamList` with three stacks using `NavigatorScreenParams`.

4. Sketch `CompositeScreenProps` for Home (stack + tabs + root) — names only.

5. PR rule: “Screens may not …”

6. Align `ROUTES` with `keyof HomeStackParamList` in one line of intent.

## Interview questions

1. How do you type route params in React Navigation?  
   **Follow-up:** How does a screen **read** them?

2. Nested navigators — why do types get harder, and what do you do?

3. Why not `any` on `route.params`?

4. What are `NativeStackScreenProps` and `CompositeScreenProps`?

5. How do you keep route **names** from drifting (linking / notifications)?

## Connections

1. How do types **encode** [tab-then-screen](../34.%20nested-nav-architecture/notes.md)?
2. Why [useNavigation is nearest](../33.%20nav-building-blocks/notes.md) until you **composite**?
3. How does this **not** replace [auth tree swap](../35.%20auth-flow-patterns/notes.md)?
4. Next unit: even a **perfect** ParamList shouldn’t hold a **balance object**. Why?
5. How will [linking](../04-navigation.md) `config` keys relate to ParamList names?
