# Components map to native views — Answers

## Core recall

1. **Host/core:** RN primitives that become **native views**. **Composite:** JS that **renders** those (UI kit, screens).
2. **Layout container.** **No** raw strings.
3. Only the **`Text` host** maps to a native **text** view; `View` doesn’t take text nodes like HTML.
4. **Inline styles/inheritance** and inline presses live on the **Text** tree; parent `View` isn’t a CSS `span` parent.
5. **ScrollView:** mount **all**. **FlatList:** **window** / virtualize.
6. **Local:** `require(...)`. **Remote:** `{ uri: 'https://...' }`.
7. One API for **press states**, hitSlop, long press; portable vs Android-only ripple Touchables.
8. **`onChangeText`** is the usual RN-shaped handler (`value` is the string).

## Explain why

1. No HTML content model, no text nodes, no CSS cascade. Flex **box** only.
2. **All rows exist** as native views → memory + layout. Simulator RAM hides it; a feed on a cheap phone won’t.
3. **`color` is a Text style.** View doesn’t stylesheet-inherit into Text like CSS.
4. Screen readers walk **native text views**; oversplitting sounds like chopped speech.
5. Perf is **leaves + list windowing**. A `Card` is still `View`s underneath.
6. Ripple is **Android**. iOS won’t get the same host feedback; `Pressable` is the cross-platform default.

## Compare and contrast

1. **View:** box. **Text:** glyphs/strings.
2. **All mounted** vs **virtualized window**.
3. **Pressable:** modern, state-driven style. **TouchableOpacity:** common legacy fade.
4. **Host vs wrapper.**
5. **Packed asset** vs **network**.
6. **`onPress` + Pressable/Text**, not `onClick`/`<button>` DOM.

## Predict the output

1. **Error / invalid** — text not in `Text`.
2. **200 native rows** mounted. Jank, memory, slow first layout.
3. **Not via View `color`.** Put `color` on `Text`.
4. **Android:** ripple (if used correctly). **iOS:** no NativeFeedback ripple — often **no visual** or a fallback. Don’t pick it as the only press primitive.

## Debugging

1. Wrap the string in **`<Text>`**.
2. **Virtualize** (`FlatList`). Memo doesn’t unmount the extra 499 rows.
3. **Profiler + what’s inside** (huge image, nested ScrollViews). Don’t jump to a custom native view first.
4. Use **`require('./logo.png')`** or `{ uri }` — a bare filename isn’t a source.

## Application

1. `<View><Text>Save</Text></View>` (plus `Pressable` if it’s a control).
2. `<Text>terms <Text onPress={...} style={styles.link}>link</Text></Text>`
3. **Short, fully visible** content (form, settings) where windowing is overkill.
4. `<Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={...}><Text>Go</Text></Pressable>`

## Interview questions

1. **Spoken:** Core components are host views: `View` container, `Text` for strings, `Image`, `ScrollView` (all children), `TextInput`, `Pressable` for presses. They map to UIView/TextView/etc.  
   **Follow-ups:** Strings only in Text. Long lists → FlatList. Pressable over new Touchable stacks.

2. **Spoken:** Different host: no HTML tags, no text-in-div, no `<a>`. Same React, different catalog.

3. **Spoken:** Library components **compose** core hosts. Interviews still want the **leaves**.

4. **Spoken:** Nested `Text` with `onPress`, or `Pressable` around that word; stay in the text tree for reading flow.

5. **Spoken:** Only visible rows should exist as native views so UI thread and memory survive.

## Connections

1. Those names **are** the host types from unit 1.
2. Every extra child is **layout/draw** on **UI thread**.
3. Metro **packs** `require`d images into what `Image` displays.
4. Yoga **sizes** the `View` you already chose; it doesn’t turn `View` into `Text`.
5. This unit: **when** to virtualize. Later: **how** to tune `FlatList`.
