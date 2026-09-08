# How React Native differs from React on the web

## What you need to know

**React** (the library) reconciles a tree of **React elements** and commits updates to a **host**. The host is a plug-in:

| App | Reconciler | Commit target (“host”) |
| --- | --- | --- |
| React web | Same React | Browser **DOM** (`div`, `span`, …) via `react-dom` |
| React Native | Same React | **Native views** via the RN renderer (`View` → `UIView` / Android `View`, …) |

You still write components, hooks, and JSX. What changes is **what a host component maps to**, plus the **runtime**: no browser document, no CSS cascade, no URL-first navigation by default, and a **JS ↔ native** boundary.

This unit is **host vs DOM**. Later fundamentals cover *how* JS talks to native ([bridge](../02-architecture.md) / New Architecture), threads, Yoga details, and lists. Do not collapse those into “RN is just different.”

Curriculum this unit completes:

- Same React, different renderer / host
- Native view mapping (iOS / Android)
- What you **do not** get from the browser
- Styling / navigation / library consequences
- The “RN is a WebView” misconception

---

## Same React, different host

React’s job on both platforms:

1. Run your function components (render phase).
2. Diff the new element tree (reconciliation).
3. **Commit** planned updates to whatever the renderer owns.

On the web, commit calls DOM APIs (`createElement`, `setAttribute`, insert/remove nodes).

In React Native, commit talks to a **native renderer** that creates and updates **platform primitives**. `View` and `Text` are not HTML tags; they are **host components** whose `type` is implemented by RN, not by the browser.

```jsx
// Same idea as web: return a description. Different leaves.
function Title({ children }) {
  return (
    <View>
      <Text>{children}</Text>
    </View>
  );
}
```

There is **no** `document.getElementById`. Refs attach to **native view instances** (or JS wrappers around them), not `HTMLDivElement`.

**React Native is not a WebView wrapping your site.** A WebView *can* exist as one component that hosts *web content*. The app UI itself is native views driven from JS. Saying “RN is just a WebView” is a senior-interview red flag.

---

## What host components map to

Approximate mapping (interview-level, not a 1:1 dump of every subclass):

| RN component | iOS (typical) | Android (typical) |
| --- | --- | --- |
| `View` | `UIView` | `View` / `ViewGroup` |
| `Text` | `UILabel` / text native view | `TextView` |
| `ScrollView` | `UIScrollView` | `ScrollView` |
| Virtualized lists (`FlatList`, …) | native scroll + windowing | often **`RecyclerView`-backed** lists |

You get **native look-and-feel** and platform APIs (status bar, permissions, biometrics, push) because the leaves are real platform views — not because React magically became Swift/Kotlin.

`react-native-web` is the **inverse** experiment: same RN primitives, **DOM** as host. That proves the model (renderer is swappable). This track is **native** host.

---

## What “no browser” actually means

There is no real **DOM**, no CSS **cascade/selectors**, and no `window` / `document` as in Chrome.

Consequences:

- **No** `div` / `span` / `className` / `document.querySelector`.
- **Strings must live in `<Text>`.** `<View>hello</View>` is invalid; web would just put a text node in a `div`.
- Layout is **Yoga** (Flexbox subset), not full CSS Grid/cascade. Default `flexDirection` is **`column`**, unlike typical web row-ish document flow.
- Sizing is density-independent units, not `px`/`rem`/`vh` as on web.
- **`window`**: not a Browser Window. Use `Dimensions` / `useWindowDimensions` / React Navigation for “how big is the screen.”
- **Navigation is not URL-first.** Stacks/tabs are in-memory (React Navigation, etc.) unless you add **deep linking**. There is no “the address bar is the source of truth” unless you build that.
- **Web libraries that touch the DOM fail** (`react-dom`, many `document`/`window` CSS-in-JS setups, `react-router` DOM bindings). Pure JS (`date-fns`, Zod, Zustand, React Query) often works.

```jsx
// WEB — fine
<div className="row">
  Hello
  <span className="muted">world</span>
</div>

// RN — text must be in Text; style is an object (or StyleSheet), not a className
<View style={styles.row}>
  <Text>Hello</Text>
  <Text style={styles.muted}>world</Text>
</View>
```

`fetch` exists. `localStorage` does not (use AsyncStorage / MMKV / secure storage). `window.location` is not how screens change.

---

## Why the JS / native boundary shows up in every senior answer

On the web, “the host” is still mostly **the same process** as JS (the page). In RN, **JS runs in a JS engine** (often Hermes); **views layout and draw on the UI/main thread**. Updates must **cross** into native.

You do not need the full Bridge lecture here. You do need this sentence:

> Because commit updates **native views**, high-frequency work (scroll, gestures, animations) and large payloads hit a **JS ↔ native** boundary. That is why we care about threading, the (legacy) bridge vs JSI/Fabric, and keeping animations off a congested JS path — later chapters.

Mobile constraints ride along: slower CPUs, memory, cold start, no “just ship a 5MB JS hydration on 3G and hope.” That is **why** lists, Hermes, and native modules appear in the same interview as “what’s the host?”

---

## Practical code differences that interviewers poke

**1. Wrong host component (web muscle memory)**

```jsx
// Will not work in RN
export function Card() {
  return <div style={{ padding: 16 }}>Hi</div>;
}
```

Use `View` / `Text` from `react-native`.

**2. Assuming CSS cascade**

```jsx
// Web: .card span { color: gray } might style the child
// RN: parent style does not cascade into Text the way CSS does.
<View style={{ color: 'gray' }}>
  <Text>this is not automatically gray</Text>
</View>
```

Text styles belong on `Text` (limited inheritance exists for nested `Text`, not web-style sheets).

**3. Importing a DOM library**

```ts
import { createPortal } from 'react-dom'; // no DOM — this is the wrong renderer
```

Portals, `document.body`, `window.addEventListener('resize')` need RN equivalents (`Modal`, `useWindowDimensions`, native event APIs).

---

## Common mistakes and misconceptions

- **“RN is a WebView.”** Optional `WebView` ≠ the architecture. The app is native views + a JS bundle.
- **“JSX is HTML.”** JSX is elements. On web, host types look like HTML tags. In RN they are `View`/`Text`/…
- **“We reconcile a virtual DOM onto the DOM.”** In RN you still reconcile **React elements**; you do **not** commit to the browser DOM.
- **“Same CSS as web.”** Yoga Flexbox + a **subset** of CSS-like props; no cascade; column default.
- **“Any npm React library works.”** If it imports `react-dom` or `document`, it won’t. Check “works with React Native.”
- **“Navigation is React Router.”** Default mental model is **native stacks**, not pathnames (linking is extra).
- Mixing **react-dom** and **react-native** in one tree without a real web target (`react-native-web` or a separate web app).

---

## Connections to other concepts

`React (reconcile) → renderer (react-dom | RN) → host (DOM | native views)`

- **Web [virtual DOM](../../react/1.%20virtual-dom/notes.md):** elements are the description; only the **last mile** (host) changes.
- **[Render vs commit](../../react/2.%20render-vs-commit/notes.md):** still two phases; commit applies **native** mutations, not DOM APIs.
- **Bridge / New Architecture** (`02-architecture.md`, later sections in this chapter): *how* JS instructs native, not *what* the host is.
- **Yoga / StyleSheet** (section 9 of this chapter): *how* layout is computed on that host.
- **React Navigation** (`04-navigation.md`): no URL bar unless you add linking.

---

## Interview perspective

You should be able to:

1. Say **same React, different host** in one breath.
2. Name **native views** (iOS `UIView` / Android `View`) not “a virtual DOM in a browser.”
3. List concrete missing web pieces: DOM, CSS cascade, `document`, URL-first nav, DOM npm libs.
4. Reject **“RN is a WebView.”**
5. Open the door to **JS/native boundary** without dumping JSI unless they ask.

Preserved spoken answer:

> React Native uses React’s reconciliation, but instead of updating the DOM it updates native views through a renderer. Components like `View` and `Text` map to platform primitives. That’s why we get native look-and-feel and platform APIs, but we must think about the JS/native boundary, threading, and mobile constraints.

Add if they follow up: “The reconciler is the same idea as web — elements in, host mutations out. `react-dom` mutates the document; the RN renderer mounts `UIView`/`View`. That’s also why DOM libraries and CSS-as-on-web don’t transfer.”

From CV work (MyCreditInfo, Wizer, Online School, etc.): you already used this split — **hooks and reconciliation transferred**; **host, styling, navigation, and native APIs** were the RN-specific layer.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
