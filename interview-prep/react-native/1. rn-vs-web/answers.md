# How React Native differs from React on the web — Answers

## Core recall

1. **Same:** React components, hooks, JSX, reconciliation. **Different:** the **renderer/host** — DOM vs native views — plus runtime (no document/CSS-as-web, JS↔native).
2. The **platform UI tree** React commits into: browser DOM on web; **native views** in RN.
3. **`View`:** iOS `UIView`, Android `View`/`ViewGroup`. **`Text`:** iOS text/`UILabel`-class view, Android `TextView`. Lists often hit `UIScrollView` / `RecyclerView`-backed implementations.
4. **No.** The app UI is native views + a JS bundle. `WebView` is an *optional* component that embeds web content.
5. Any three: real **DOM**, **CSS cascade**, `document`/`window` as in the browser, URL-first navigation, `className`/HTML tags. (Pick three.)
6. **No cascade/selectors** — JS style objects/arrays; layout via **Yoga** Flexbox subset, not full CSS.
7. **No** — stacks/tabs in memory unless you add **deep linking**.
8. They import **`react-dom`**, `document`, or other **browser APIs**. RN’s host is not the DOM.

## Explain why

1. Hooks/JSX produce **React elements**. The reconciler is host-agnostic; only **host component types** and the **commit backend** change.
2. Leaves are **real `UIView`/`View`s**, so you get platform drawing, accessibility, and native APIs — not because JSX used HTML tag names.
3. RN host `View` is a **container**, not an HTML element that can hold DOM text nodes. Text is a **separate native view type**.
4. That library’s “React” still assumes **`react-dom` + a document**. RN never created those objects.
5. Commit must **instruct native UI** (other thread/process boundary). Frequency and serialization cost show up even if you haven’t named “the bridge” yet.
6. RN still has an **element tree**; it does **not** commit to the **browser DOM**. “Virtual DOM → DOM” is the **web** last mile.

## Compare and contrast

1. **`react-dom`:** mutate `HTMLElement`s. **RN renderer:** create/update **native views** (legacy renderer or Fabric).
2. **HTML tags** → DOM nodes. **`View`/`Text`** → native primitives; not interchangeable names for `div`/`span`.
3. **Web:** stylesheets, cascade, `className`. **RN:** explicit style objects, limited inheritance, Yoga, column default.
4. **Router:** URL is often source of truth. **RN:** navigation state is typically **in-app**; linking is extra.
5. **`WebView`:** one native view that renders web content. **Architecture:** the *app* is not that WebView.
6. **Zod/date-fns:** no host. **`react-dom`:** wrong renderer. CSS-in-JS that needs a DOM stylesheet APIs usually dies.

## Predict the output

1. **Invalid / runtime error** (text not inside `Text`). RN does not put string children on `View` the way HTML puts text in a `div`.
2. **Not like web cascade.** `color` on `View` does not stylesheet-inherit to `Text`. Put `color` on `Text` (nested `Text` can inherit from parent `Text`, not from `View` the way CSS does).
3. **Wrong renderer / no DOM.** `createPortal` expects a DOM container. Use RN `Modal` / native patterns.
4. **Host component** — JSX is fine; `div` is not a registered RN host type. Metro may still parse the file; native render cannot mount `div`.

## Debugging

1. **Wrong architecture.** No WebView in the middle of reconciliation. If it’s slow, measure JS thread / lists / bridge — don’t blame a WebView that isn’t the renderer.
2. Layer: **web host APIs** in a **native** app. Replace with RN modal/portal equivalents; don’t polyfill `document.body` as a product strategy.
3. RN default **`flexDirection: 'column'`**. Web flex containers often default to **row**. Set `flexDirection` explicitly.
4. They assumed **URL as navigation**. Need React Navigation + **linking** (or accept there is no shareable path yet).

## Application

1. `<View style={styles.box}><Text>Save</Text></View>` (plus `StyleSheet` if you want).
2. Native apps don’t have a URL bar as the default source of truth; you use a **navigation library** that owns a stack. Pathnames require **linking** on purpose.
3. Does it depend on `react-dom`/`document`? Is there an official RN build? Does it need CSS-in-JS that injects stylesheets?
4. **Web:** React → `react-dom` → DOM. **RN:** React → RN renderer (Fabric/legacy) → native views.

## Interview questions

1. **Spoken:** Same React reconciliation; web commits to the DOM via `react-dom`, RN commits to native views (`View`/`Text` → `UIView`/`TextView`, etc.). Not a WebView. DOM libraries fail because there is no document.  
   **Follow-ups:** Host mapping; Yoga not full CSS; linking optional.

2. **Spoken:** Host = the UI system React mounts into. Swap DOM for native primitives; keep the reconciler.

3. **Spoken:** Transfer: hooks, state, Query/Zustand, reconciliation mental model. Relearn: host components, Yoga, navigation, native APIs, JS/native boundary.

4. **Spoken:** Commit updates **another world** (UI thread / native views), not `document`. High-frequency UI must respect that crossing.

5. **Spoken:** JSX isn’t HTML; styles aren’t CSS files with cascade. They’re descriptions that become **native views** through a renderer.

## Connections

1. Elements still describe UI; “VDOM” talk is the **element tree**. Only the **commit target** is native, not the DOM.
2. Render still computes the tree; **commit** applies host ops — native insert/update instead of DOM APIs.
3. Once you know commit hits **native**, you can ask *how* messages get there (bridge vs JSI) and *which thread* draws — next units.
4. No cascade ⇒ you **compose style arrays** and learn Yoga defaults (column) instead of copying CSS sheets.
5. Same **React Query / Zustand / hooks** across web-ish and RN codebases; the new work was **views, lists, native modules, navigation**, not “a different React.”
