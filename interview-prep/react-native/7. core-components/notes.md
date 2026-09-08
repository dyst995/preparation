# Components map to native views

## What you need to know

React Native **core components** are **host components**: they commit to **native views**, not DOM nodes. `View` is a **container**. **Strings must live in `Text`**. `ScrollView` **mounts every child**. `FlatList` **virtualizes**. Modern press handling defaults to **`Pressable`**.

This unit is **which primitive to reach for** and the **web 1:1 traps**. Prerequisite: [RN vs web](../1.%20rn-vs-web/notes.md) (host, not WebView). Lists tuning: later in this chapter / [06-performance.md](../06-performance.md). Styling/Yoga: section 9.

Curriculum this unit completes:

- `View`, `Text`, `Image`, `ScrollView`, `TextInput`, `Pressable` / `Touchable*`
- Why `Text` nesting matters
- Web concepts that do **not** map
- Core host vs third-party composites

---

## Core host map (interview table)

| RN | Role | Native idea (approx.) |
| --- | --- | --- |
| **`View`** | Box / flex container | `UIView` / Android `View` |
| **`Text`** | Text (the **only** place for strings) | `UILabel` / `TextView` |
| **`Image`** | Bitmap | native image view |
| **`ScrollView`** | Scroll **all** children mounted | `UIScrollView` / `ScrollView` |
| **`TextInput`** | Editable field | native text field |
| **`Pressable`** | Hit target with press state | native touch handling |
| **`TouchableOpacity`** / **`TouchableHighlight`** / **`TouchableNativeFeedback`** | Older press wrappers | still host touches; **prefer `Pressable`** for new code |

**Composite** (not a host leaf): your `Card`, React Navigation’s `Screen`, a UI-kit `Button` — they **render down** to these primitives. Interview: “I know what’s a **host node** vs a **JS wrapper**.”

---

## `View` is not `div`

`View` is a **layout box**. It does **not** accept raw text children. It does **not** cascade CSS `color` onto text like a web `div`.

```jsx
// Invalid — string is not a View child
<View>Hello</View>

// Valid
<View>
  <Text>Hello</Text>
</View>
```

Refs on `View` are **native view** handles (`measure`, `focus` where supported) — not `HTMLDivElement`.

---

## Why `Text` nesting matters

1. **Host rule:** only `Text` hosts strings.
2. **Styling:** font/color live on **`Text`**. Nested `Text` can **inherit** from a parent **`Text`** (inline bold/link). A `View` wrapping text does **not** replace a `<span>` inside a `<p>` with CSS cascade.
3. **Pressable text:** wrap with nested `Text` + `onPress` for inline links, or put `Pressable` around `Text` — don’t assume web `<a>` inside a paragraph.

```jsx
<Text>
  Hello <Text style={styles.bold}>world</Text>
</Text>
```

Accessibility: one `Text` tree is a **text native view**; splitting randomly into many `Text`s can make **screen readers** choppy. Prefer a coherent text tree when the copy is one sentence.

---

## `Image`

Local: `require('./logo.png')` ([Metro](../6.%20metro/notes.md) packs it). Remote: `{ uri: 'https://...' }`.

Not `<img src>`. `resizeMode` (`cover` / `contain` / …) is the RN word, not CSS `object-fit` by name (similar idea). Don’t download a 4000px asset into a 40px avatar (assets section later).

---

## `ScrollView` vs `FlatList` (this unit’s bar)

**`ScrollView`:** mounts **all** children. 500 rows = **500 native rows** in the tree. Fine for a **settings page**. Death for a **feed**.

**`FlatList` (and friends):** **windowing** — only a viewport (+ buffer) of rows exist as views. That’s **virtualization**.

```jsx
// Settings: OK
<ScrollView>{sections.map(...)}</ScrollView>

// Feed: not OK
<ScrollView>{bigArray.map((item) => <Row key={item.id} />)}</ScrollView>
```

You do **not** need every `windowSize` prop in this unit. You **do** need: **map-in-ScrollView is a junior tell** for long data.

---

## `TextInput` and presses

**`TextInput`:** native field. Controlled `value`/`onChangeText` is the RN shape (`onChange` exists but `onChangeText` is the usual). Keyboard / `keyboardType` / focus are **platform**, not a DOM input.

**`Pressable`:** one component for **press in/out, long press, hit slop**, `style` as a function of state. Prefer it over stacking `TouchableOpacity` unless the codebase is already Touchable-shaped.

`TouchableNativeFeedback` is **Android ripple**; iOS doesn’t have that same host. `Pressable` is the **portable** default.

---

## Web 1:1 traps

| Web habit | RN |
| --- | --- |
| `div` / `span` / text nodes | `View` / `Text` / **must wrap strings** |
| `onClick` | `onPress` |
| `<a href>` | `Linking` / navigation — not a host `<a>` |
| CSS `overflow: auto` on a div | `ScrollView` / list primitives |
| `display: none` | `null` render or `{ display: 'none' }` — still think **native views** |
| `button` | `Pressable` + `Text`, or a design-system button (**composite**) |

There is no HTML **content model**. Don’t paste JSX from a web snippet.

---

## Common mistakes and misconceptions

- **`<View>hello</View>`.** Illegal.
- **`ScrollView` + huge `.map`.** Use a virtualized list.
- **New screens still on `TouchableHighlight`** without a reason.
- Treating a UI-kit `Button` as a **host** in performance talk — the **leaves** are still `View`/`Text`.
- **`Image` with a path string** instead of `require` / `uri`.
- Assuming **nested `View` text inheritance** like CSS.

---

## Connections to other concepts

`JSX host type → Fabric/legacy renderer → UIView / Android View`

- **[RN vs web](../1.%20rn-vs-web/notes.md):** same rule, this unit names the **catalog**.
- **[Threads](../4.%20threads/notes.md):** every extra `ScrollView` child is **native layout** work on the **UI thread**.
- **Lists chapter:** virtualization details.
- **Yoga:** how `View` **lays out**; not which component to pick.
- Design system: composites **on top of** these hosts.

---

## Interview perspective

You should be able to:

1. Map `View` / `Text` / `Image` / `ScrollView` / `TextInput` / `Pressable`.
2. Explain **why strings need `Text`**.
3. Contrast **ScrollView vs FlatList** in one sentence.
4. Prefer **`Pressable`**.
5. Separate **core host** vs **third-party composite**.

Spoken (30–60s):

> RN core components are host views: `View` is a container, `Text` is the only place for strings — you can’t drop text in a `View` like a `div`. `ScrollView` mounts everything, so long lists use `FlatList`. I use `Pressable` for presses unless I’m matching an existing Touchable API. A design-system button is still a composite over those primitives, not a DOM widget.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
