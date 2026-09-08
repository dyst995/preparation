# React Navigation building blocks — Answers

## Core recall

1. **Native:** platform primitives; better feel/perf. **JS:** JS-driven transitions; more flexible in **edge** cases. **Default: native stack.**
2. **Default native stack for feel/perf; nest tabs for primary sections; push feature stacks for transfers/KYC; nesting deliberate — each navigator a clear responsibility.**
3. **Which child routes exist and which is active** (stack / selected tab / drawer).
4. **Tabs:** section switcher (siblings stay). **Stack:** hierarchy / flow (push-pop).
5. **Another section switcher** (hamburger, tablet). Optional; don’t double with tabs as two sources of “where am I.”
6. A **screen** of navigator A **renders** navigator B — B has **its own** state.
7. **Navigation state**; context for hooks; **`linking`**.
8. URLs address **nested** screens; a flat map doesn’t name the **path through** tabs/stacks.
9. **Navigate/goBack/options**; **this screen’s params**; **focus/blur** (not merely mount).
10. **Card = push** (deeper in a flow). **Modal = overlay** (receipt/help).

## Explain why

1. Those are **different jobs**. One state machine **can’t** mean both “Wallet tab” and “Confirm step” without **back** and **chrome** lying.
2. **Native** pop gesture, transitions, less JS work on the animation.
3. **Custom interpolators / header behavior** native stack doesn’t offer — not ideology.
4. Tab screens **stay mounted**; the effect **already ran**.
5. Unstable function identity → React Navigation treats it as a **new** effect → **re-run** subscribe/cleanup every render.
6. Two containers = **two** states, **broken** linking/`navigate` across the app.
7. `navigate` is handled by the **nearest** navigator that **declares** the name. Home’s stack **doesn’t** have Confirm.
8. Back must mean **previous step**; tab bar is **sections**. Extra tabs would make Confirm a **section**.
9. Presentation is **how a stack screen appears**. Auth vs App is **which tree is mounted**.
10. The mapper **won’t find** the screen at the path you think; link **fails** or hits the **wrong** screen.

## Compare and contrast

1. **Who draws the transition** (native controllers vs JS Animated). Both **stacks**.
2. **Stack** vs **section switcher**. Different navigator **types**.
3. Both **siblings / sections**; drawer is **edge chrome**; tabs are **bottom** primary. Same **job** family.
4. **Depth in a flow** vs **which product area**.
5. **Object that dispatches** vs **this route’s params**.
6. **Mount/unmount** vs **focus/blur** (tabs stay mounted).
7. **Push in the stack** vs **overlay**.
8. **Primitives/hooks/options** vs **conditional Auth/App trees**.

## Predict the output

1. **Back walks Login/Home/Amount** — tab identity **gone**; **back-to-login** / leftover steps. Nesting wasn’t there.
2. **No refetch** — effect didn’t re-run.
3. Link may **not** resolve into App (wrong/missing container) or **race** the unmounted tree. **One** container.
4. Confirm **feels like a sheet** you **dismiss**, not a **step** you **pop** — wrong **back** semantics for a flow.
5. **Subscribe/unsubscribe every render** — missed events or **leaks** / duplicate listeners.
6. **Not handled** / **wrong screen** — config **doesn’t match** the tree.

## Debugging

1. **Switch default stacks to native-stack** unless there’s a **named** JS-only need.
2. Confirm isn’t a **section**. Use **PaymentsStack**; keep **one** Payments tab.
3. **Action not handled** (or nowhere). Register Receipt on a navigator this `navigate` can **see**, or **target** that stack (next section).
4. Used **`useEffect` on mount**; tab **didn’t unmount**. Use **`useFocusEffect`**.
5. **Profile the screen / custom header JS cost** — jank often **render weight**, not native-stack itself.
6. **`setOptions` every render** can **loop** or **churn** the header. Set **statically** or when **inputs** change.

## Application

1. Native default; spoken paragraph; tabs = sections; stacks = flows.
2. Container → Tab (Home | Payments) → each a **native stack**. Tabs: **where**. Stacks: **how deep**.
3. Home/Profile: **tabs**. Tx details / Amount / Confirm: **card push** on that tab’s stack. Receipt: **modal**.
4. `useFocusEffect(useCallback(() => { log('focus'); return () => log('blur'); }, []));`
5. **…has one responsibility (sections vs flow vs root chrome).**
6. **On `NavigationContainer`.** Shape **mirrors nested screens**.

## Interview questions

1. **Spoken:** Native stack — platform primitives, better feel and performance. JS stack if I need **custom** transitions native stack doesn’t give. **I default to native.**  
   **Follow-up:** Custom interpolators / odd headers — **rare**.

2. **Spoken:** Tabs for **primary sections**. Each tab a **stack**. Transfers/KYC are **feature stacks** you **push**. Nesting is **deliberate**.  
   **Follow-up:** One flat stack **destroys** back and tab state.

3. **Spoken:** **One** root: navigation **state**, hook **context**, **`linking`**. Linking **config nested** like the tree.

4. **Spoken:** Tabs **keep screens mounted**. `useEffect` is **mount**. **`useFocusEffect`** is **visit**.

5. **Spoken:** **Card** for Amount→Confirm. **Modal** for receipt/help. Not how I show **Login**.

## Connections

1. Architecture **picks Auth vs App**. This unit **fills App** with tabs + native stacks.
2. Session/Query providers must **wrap** navigation so screens can **read** them; container is **inside** the shell.
3. React Navigation **owns** route state. A Zustand copy **desyncs** on deep link / reset.
4. **Cross-tab navigate** / **action not handled** — next section.
5. Params are **ids/flags**, not **profile objects** — fetch canonical data.
