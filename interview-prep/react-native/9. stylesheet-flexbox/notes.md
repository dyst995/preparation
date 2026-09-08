# StyleSheet and Flexbox (RN vs web)

## What you need to know

RN layout is **Flexbox via Yoga**, not a CSS engine. **Default `flexDirection` is `column`** (web flex containers are often **row**). There is **no cascade/selectors** — you pass **style objects or arrays**. Properties are a **CSS-like subset**. Numbers are **density-independent** (not `px`/`rem`). **Text styles belong on `Text`**. Shadows are **platform-split**. `StyleSheet.create` is the usual registry (stability + some checks). **Safe area** and **absolute** positioning are first-class mobile concerns.

Memorize (from the outline):

1. Default flex direction: **`column`**
2. **No CSS cascade** — compose arrays
3. **Subset** of CSS, not Grid-complete CSS
4. Units ≈ **dp**, not CSS `px`/`rem`
5. **Limited inheritance** — text on **`Text`**

Curriculum: Yoga, defaults, StyleSheet, density, shadows, absolute, safe area. Not a full CSS Flexbox recert — see web [flexbox](../../react/38.%20flexbox/notes.md) for main/cross axes; **swap the default axis** for RN.

---

## Yoga

**Yoga** is the **layout engine**. It takes the **style objects** on host views and computes **x/y/width/height** for the native tree (on the **[UI thread](../4.%20threads/notes.md)** after layout).

Same mental model as CSS Flexbox: **main vs cross**, `justifyContent`, `alignItems`, `flex: 1`. Differences are **defaults, missing CSS, and JS objects**.

There is **no CSS Grid** as on web (some libs fake it). Don’t answer “I used `grid-template-areas`.”

---

## The column default (the interview trap)

```jsx
<View style={{ flex: 1 }}>
  <View style={{ height: 40, backgroundColor: 'red' }} />
  <View style={{ height: 40, backgroundColor: 'blue' }} />
</View>
```

Children **stack vertically**. On web, a flex `div` with no direction is often **row**. If a layout “sits in a row on web and a column on RN,” you forgot **`flexDirection: 'row'`**.

`alignItems: 'center'` on a **column** container centers on the **horizontal** cross axis — same axis rules as CSS, **different default direction**.

---

## No cascade — arrays instead of selectors

There is no `.card span { color }`. You **compose**:

```jsx
<View style={[styles.box, compact && styles.boxCompact, { marginTop: 8 }]} />
```

Later styles in the array **win** on conflicting keys (like a cheap right-to-left override). `undefined` entries are ignored.

**Text:** `color` / `fontSize` on a **`View` do not cascade** into `Text` like CSS. Put them on **`Text`**. Nested **`Text`** can inherit from parent **`Text`**.

---

## `StyleSheet.create`

```js
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
```

**Why teams use it:** named styles, **some** property validation, **stable references** (helps `React.memo` vs a **new** `{ flex: 1 }` object every render). Historically also cheaper to **identify** styles across the native boundary.

It is **not** “CSS modules.” Inline `style={{ flex: 1 }}` is legal; don’t religious-war it on a one-off. **Don’t** allocate a new style object every row of a `FlatList` if you care about memo.

---

## Units and `PixelRatio`

A style `width: 16` is **not CSS `16px`**. It’s a **density-independent** unit (dp-like): roughly the same **physical** size on different DPI screens. Yoga/native scale to **device pixels**.

**`PixelRatio`:** e.g. hairline `StyleSheet.hairlineWidth`, or `1 / PixelRatio.get()` for a 1-physical-pixel border. Don’t write `1px` strings.

No `rem`/`em`/`vw` as in CSS (use `%` of parent, `flex`, or `useWindowDimensions`).

---

## Shadows: iOS vs Android

**iOS:** `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` (and often `overflow: 'visible'`).

**Android:** **`elevation`** is the usual; iOS shadow props are largely **ignored**.

Use **`Platform.select`** ([platform-specific](../8.%20platform-specific/notes.md)) — this is the textbook small-value split, not two whole files.

---

## Absolute positioning and safe areas

`position: 'absolute'` is relative to the **parent** (the RN parent `View`), plus `top`/`left`/`right`/`bottom`. There is no CSS containing-block trivia dump required; **don’t** assume a `div` with `transform` tricks from the web.

**Safe area:** notch, status bar, home indicator. `SafeAreaView` / **`react-native-safe-area-context`**. A `top: 0` header **under the notch** is the classic miss. Safe area is **not** Yoga flex — it’s **insets**.

---

## Common mistakes and misconceptions

- **Assuming flex default is `row`.**
- **CSS cascade / classNames.**
- **`gap`:** supported in modern RN — don’t swear it never existed; still confirm the RN version. Prefer explicit margin if targeting old RN.
- **`color` on `View` for children.**
- **Same shadow API on Android.**
- **`px`/`rem` in styles.**
- Treating `StyleSheet.create` as a runtime perf miracle that fixes a 2000-view tree.

---

## Connections to other concepts

`style objects → Yoga (UI thread) → native frames`

- **[Core components](../7.%20core-components/notes.md):** `View` is the flex container; `Text` owns type styles.
- **[Platform](../8.%20platform-specific/notes.md):** shadows, fonts.
- **[Threads](../4.%20threads/notes.md):** huge trees → **UI** layout cost.
- **Web flexbox:** same axes; **column default** + **no cascade**.
- **RN vs web:** no CSS engine.

---

## Interview perspective

You should be able to recite the **five differences** and the **column default** without notes.

Preserved spoken answer:

> RN uses Flexbox via Yoga, but defaults differ — notably `flexDirection` defaults to column. There’s no CSS cascade; styles are explicit objects/arrays. Only a subset of CSS concepts exist, and platform-specific styling (especially shadows and fonts) still matters. I treat layout as mobile-first Flexbox, not web CSS.

Add: “Density-independent numbers, not `px`. Safe area for notches. `StyleSheet.create` for named, stable styles.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
