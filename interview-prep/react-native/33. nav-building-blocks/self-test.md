# React Navigation building blocks — Self-test

## Core recall

1. Recite Native Stack vs JS Stack (one line each) and which is the **default today**.
2. Recite the spoken interview answer (native stack / tabs / feature stacks / deliberate nesting).
3. What **state** does a navigator own?
4. Bottom Tabs vs a stack: what is each **for**?
5. When would you use a **Drawer**?
6. What does **nesting** mean (one sentence)?
7. What does **`NavigationContainer`** do (three jobs)?
8. Why does **linking `config`** nest like the navigator tree?
9. What do `useNavigation`, `useRoute`, and `useFocusEffect` each give you?
10. `card` vs **`modal`** presentation — meaning?

## Explain why

1. Why can’t one navigator honestly own **both** “which tab” and “which transfer step”?
2. Why is Native Stack the **usual default**?
3. Why might you still pick **JS Stack**?
4. Why do inactive **tab** screens often make `useEffect([])` the wrong “on visit” hook?
5. Why is `useCallback` required around the `useFocusEffect` callback?
6. Why is **one** `NavigationContainer` required?
7. Why does `navigate('Confirm')` from Home **not** open Payments Confirm?
8. Why is a transfer/KYC a **stack** nested **in** (or under) tabs, not extra tabs?
9. Why is presentation **not** a third auth tree?
10. Why does a **flat** linking map fail against a **nested** app?

## Compare and contrast

1. Native Stack vs JS Stack.
2. Native Stack vs Bottom Tabs.
3. Bottom Tabs vs Drawer.
4. Feature stack vs tab navigator (responsibility).
5. `useNavigation` vs `useRoute`.
6. `useEffect` vs `useFocusEffect`.
7. `card` vs `modal` presentation.
8. This unit vs [nav architecture](../17.%20nav-architecture/notes.md) (primitives vs Auth/App trees).

## Predict the output

1. Every screen (Login, Home, Amount, Confirm) in **one** JS stack; tabs not nested. User finishes Confirm and presses back several times. What **product** bug appears?

2. Wallet tab stays mounted. `useEffect(() => refetch(), [])` on Wallet. User switches Home → Wallet. Network?

3. Two `NavigationContainer`s: one around Auth, one around App, swapped by session. `linking` on the first only. Cold start `myapp://transfers/1` while logged in?

4. Screen `presentation: 'modal'` for Amount → Confirm. Back / dismiss — what does the user think happened vs a **card** push?

5. `useFocusEffect(() => { subscribe(); return unsubscribe; })` **without** `useCallback`. What happens on parent re-render?

6. Linking `TransferDetails: 'transfers/:id'` at the **root** `screens` map, but the screen lives under `AppTabs → PaymentsStack`. Open the URL. Likely result?

## Debugging

1. “JS stack because we need React Navigation.” PR review: what do you change by default?

2. Transfer flow implemented as **four tab buttons**. What’s wrong with **back** and **tab bar**?

3. `useNavigation().navigate('Receipt')` from a tab screen; Receipt is registered only on a **root modal stack**. Symptom class?

4. Analytics “Wallet viewed” fires once per app session, not per tab visit. Diagnose.

5. Custom JS `header` on every native-stack screen; navigation **jank** on push. First question?

6. Review: Amount screen `headerShown: false` set in the **component** via `navigation.setOptions` every render. Harm?

## Application

1. Recite Native vs JS, spoken answer, tabs vs feature stacks.

2. Sketch a tiny tree: Container → Tabs → HomeStack + PaymentsStack (Amount, Confirm). Label **responsibility**.

3. Classify: Home; Tx details; Amount; Confirm; Profile; Receipt overlay. Tab, stack push, or modal presentation?

4. Write `useFocusEffect` + `useCallback` that logs focus/blur.

5. PR rule: “Each navigator …”

6. One-line: where does **`linking` live**, and what must its **shape** match?

## Interview questions

1. Native stack vs stack — which and why?  
   **Follow-up:** When JS stack?

2. How do you nest navigators in a fintech app?  
   **Follow-up:** Why not one flat stack?

3. What is `NavigationContainer` for? Linking?

4. `useEffect` vs `useFocusEffect`?

5. Modal vs card — when?

## Connections

1. How does this unit **feed** [nav architecture](../17.%20nav-architecture/notes.md) without replacing Auth vs App?
2. Why [shell](../16.%20app-shell/notes.md) wraps the **container**, not the other way around?
3. Why [taxonomy](../23.%20state-taxonomy/notes.md) says don’t copy **current route** into Zustand?
4. Next section is **nested architecture** — what **gotcha** is intentionally **not** fully taught here?
5. How does [derived-state](../32.%20derived-state/notes.md) constrain what you put in **`useRoute().params`**?
