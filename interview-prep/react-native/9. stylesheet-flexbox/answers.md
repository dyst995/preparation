# StyleSheet and Flexbox (RN vs web) — Answers

## Core recall

1. **Yoga** (Flexbox layout engine) on host views — not a browser CSS engine.
2. **`column`**. Web flex is often **`row`**.
3. **`style={[a, b, cond && c]}`** — arrays, later keys override.
4. Any three of: **column default**, **no cascade**, **subset**, **dp-like units**, **text styles on Text**.
5. **Named/validated-ish styles** + **stable references** (and historical native ID mapping).
6. **iOS:** shadow* props. **Android:** **`elevation`** (mainly).
7. **Density-independent** (dp-like), not CSS pixels/`rem`.
8. **Notch / status bar / home indicator insets** so content isn’t under system UI.

## Explain why

1. RN default axis is **vertical**; web flex default is **horizontal**. Same `flex: 1`, different **direction**.
2. No CSS inheritance into `Text` from `View`. Type styles are **Text** props.
3. There are **no classes**. Arrays are the composition mechanism.
4. **New object identity** every render → memo props never equal.
5. Android doesn’t honor the iOS shadow set the same way; **elevation** is the platform knob.
6. **Safe area insets** > 0. `top: 0` is the **screen** top, under the notch.

## Compare and contrast

1. **Same** main/cross idea; **column** default; **no** stylesheet cascade.
2. **JS objects/arrays** vs selectors and cascade.
3. **Stable named** vs **new allocation** / weaker memo.
4. **Logical density** vs CSS absolute/`rem` root.
5. RN: offset to **parent View**. Don’t import CSS containing-block lore as required.
6. **Dynamic insets** vs a magic number that fails on other devices.

## Predict the output

1. **Stacked (column).**
2. **`styles.b`’s `marginTop`** (later in the array).
3. **No** — Hi does not get View `color`/`fontSize` like CSS. Set them on `Text`.
4. **Hairline** ≈ 1 **physical** pixel; `1` is 1 **dp** (thicker on high-DPI).

## Debugging

1. **Did you set `flexDirection: 'row'`?** Column is default.
2. Add **`elevation`** (and `Platform.select`); iOS-only shadow keys.
3. **Inline style object** identity; use `StyleSheet` / stable ref.
4. Wrap the **screen** (or use inset hooks on the header), not a random inner view.

## Application

1. `row: { flexDirection: 'row', alignItems: 'center' }`
2. `style={[styles.card, pressed && styles.cardPressed]}`
3. `Platform.select({ ios: { shadowOpacity: 0.2, shadowRadius: 8 }, android: { elevation: 4 } })`
4. Column; no cascade; subset; dp units; text on Text.

## Interview questions

1. **Spoken:** Yoga Flexbox; **column** default; no cascade — objects/arrays; CSS subset; platform shadows/fonts; mobile-first Flexbox, not web CSS.  
   **Follow-ups:** Arrays not selectors. dp not px. iOS shadow vs Android elevation. create() for named stable styles.

2. **Spoken:** Inheritance is limited; `View` isn’t a CSS font context. `Text` is the text host.

3. **Spoken:** SafeAreaView or safe-area-context insets; don’t hardcode `paddingTop: 20`.

4. **Spoken:** The layout engine that turns style objects into native frames.

5. **Spoken:** Not as a built-in like web Grid. Flex + nesting (or a library), not `grid-template-areas`.

## Connections

1. `View` = flex box; `Text` = typography styles.
2. Shadow APIs are the classic **`Platform.select`**.
3. Every node is a Yoga layout; `ScrollView` of 500 views is **UI-thread** layout.
4. Styles/layout at **runtime** on views; Metro bundled the JS; Hermes runs it.
5. Transfer **justify/align/flex**; **relearn default direction and no CSS**.
