# Navigation performance and UX

## What you need to know

[Focus vs mount](../41.%20use-focus-effect/notes.md) assumed **tabs stay mounted after first visit**. This unit is **what you opt into** so the **first paint** and **inactive screens** don’t **crush** the JS thread — and why **jank** is usually **the screen**, not React Navigation.

**Learn:**

- **Lazy** tab screens (if appropriate)
- Heavy screen **detach / freeze** (where used)
- Avoid mounting **enormous trees** on **first tab paint**
- **Header** mode and **custom header** cost

Preserve:

> Navigation jank is often from screen render weight, not the navigator itself. Profile the screen first.

The chapter **question bank** recaps **the whole file**. This unit is **perf/UX only**.

---

## Lazy tabs

**`lazy`:** don’t **mount** a tab’s screen until the user **first** focuses it.

| | **`lazy: true`** (typical default) | **`lazy: false`** |
| --- | --- | --- |
| **First App paint** | **Only the initial tab** (plus chrome) | **Every** tab screen **mounts now** |
| **First visit** to Wallet | **Mount** then (usually) **stay mounted** | Already mounted — **faster first switch**, **slower TTI** |
| **`useEffect([])`** | Runs on **first visit**, not at App start | Runs **at App start** for **all** tabs |

**Appropriate:** 4+ tabs, **Wallet** is a **heavy list**, Profile is **rarely** opened. **Don’t** lazy the **only** tab. **Don’t** lazy **if** you **must** prefetch **all** tab data at boot (usually you **mustn’t**).

**Not the same as unmount on blur.** Lazy is **defer first mount**. After visit, [§9](../41.%20use-focus-effect/notes.md) still applies unless you **unmountOnBlur**.

---

## Detach, freeze, unmountOnBlur

These are **inactive-screen** knobs on **react-native-screens** / tab options — **not** a third navigator type.

| Option | What it does | Cost |
| --- | --- | --- |
| **`detachInactiveScreens`** | Detach **native** views of inactive screens (memory / GPU) | State can **remain**; **native** views **come back** on focus |
| **`freezeOnBlur`** | **Freeze** React updates on blurred screens | **Stops** wasted re-renders of **Wallet** while you’re on **Payments**; **resume** on focus |
| **`unmountOnBlur`** | **Unmount** the React tree when the tab blurs | **Next visit remounts** — `useEffect([])` **runs again**; **lose** local UI state; **heavier** switch |

**Where used:** **heavy** Wallet/charts. **Not** on a **tiny** Home. **Freeze** is **safer** than **unmount** if you need **scroll position**. **Unmount** if the tree is **so** heavy that **keeping** it **hurts** — then **accept** remount + **useFocusEffect** still for **visits** if they **don’t** unmount… if they **do** unmount, **mount** **is** the visit.

**Interview:** name **lazy** (first paint) vs **freeze** (inactive **CPU**) vs **unmount** (nuclear).

---

## First tab paint: don’t mount the world

**AppTabs** with **`lazy: false`** + each tab a **stack** whose **root** is a **huge** list + **maps** + **charts** = **four** **enormous** trees on **login**. TTI and **JS thread** die; users blame **“navigation.”**

**Do:**

- **`lazy: true`**
- Each tab root **thin**: list **windowed** ([lists](../10.%20lists/notes.md)), **defer** charts until **focus**
- **Don’t** prefetch **every** tab’s **RQ** in **App** bootstrap ([shell](../16.%20app-shell/notes.md) **defer** non-critical)

**First paint** = **initial tab** + **shell**. Profile **that** screen.

---

## Headers: native vs JS

**Native stack native header** is **UIKit / Android toolbar** — cheap, **runs off** your **JS** layout for the **bar**.

**Custom `header` / `headerTitle` as a fat React tree** (search bar, **lottie**, **balance**) is **JS** on **every** push **animation**. That’s **header cost**.

**`headerShown: false`** + **in-screen** header: you **own** layout; **still JS**. Fine for **one** branded Home; **expensive** if **every** stack screen **reinvents** it.

**Mode:** large titles / **transparent** headers **composite** more. If push **janks**, **profile** the **header** **and** the **screen body** — don’t **switch to JS stack** first ([building blocks](../33.%20nav-building-blocks/notes.md)).

---

## Profile the screen first

**Jank on push/tab** is usually:

- **Render** cost (list, images, **context** fan-out)
- **JS thread** busy ([threads](../4.%20threads/notes.md))
- **Custom header**
- **Mounting** **three** other tabs

**Not** usually “we used native stack.” **Systrace / why-did-you-render / Flashlight** on the **Wallet** tree **before** navigator **folklore**.

---

## Common mistakes and misconceptions

- **`lazy: false`** so “tabs feel instant” — **first** paint **pays**.
- **Unmount every tab** to “save memory” — **state loss** + **jank** on **switch**.
- **Custom header on every screen** “for design system.”
- **Blaming the navigator** without **profiling** the **list**.
- **JS stack** to “fix” jank.
- Thinking **lazy** **unmounts** on blur.

---

## Connections to other concepts

`lazy (defer mount) → freeze (cheap inactive) → thin first tab → native header → profile the screen`

- **[useFocusEffect](../41.%20use-focus-effect/notes.md):** lazy **changes first** `useEffect`; **freeze** **doesn’t** remount.
- **[Native stack](../33.%20nav-building-blocks/notes.md):** **native header** is a **perf** feature.
- **[Lists](../10.%20lists/notes.md):** **windowing** is **screen weight**.
- **[Shell](../16.%20app-shell/notes.md):** **don’t** mount **all** tab data at boot.
- Chapter bank is **review**, not a new mechanism.

---

## Interview perspective

They want the **sentence**: **profile the screen**. Then **lazy**, **don’t mount four wallets**, **native header**.

Spoken:

> Navigation jank is usually the screen’s render weight, not the navigator. I profile Wallet first. I lazy-load tabs so first paint isn’t every tab, freeze or detach heavy inactive screens instead of unmounting by default, and I keep native headers unless a custom header is worth the JS cost.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
