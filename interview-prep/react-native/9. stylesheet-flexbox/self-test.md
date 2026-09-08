# StyleSheet and Flexbox (RN vs web) — Self-test

## Core recall

1. What lays out RN views — a CSS engine, or what?
2. What is RN’s default `flexDirection`? What’s the common web flex default people mix up?
3. How do you apply two styles to one `View` without CSS classes?
4. Name three of the five “memorize” differences (column, cascade, subset, units, text inheritance).
5. What does `StyleSheet.create` buy you (two bullets)?
6. iOS shadow vs Android — which APIs?
7. What kind of unit is `padding: 16`?
8. What problem does safe area solve?

## Explain why

1. Why does a “row on web, column on RN” layout happen with the same `flex: 1` and no `flexDirection`?
2. Why doesn’t `color` on a parent `View` style child `Text` like CSS?
3. Why use a style **array** instead of concatenating class strings?
4. Why might inline `style={{ flex: 1 }}` on every `FlatList` row annoy `memo`?
5. Why are iOS shadow props the wrong copy-paste for Android?
6. Why isn’t `top: 0` enough for a full-bleed header on iPhone X+?

## Compare and contrast

1. Yoga/Flexbox vs CSS Flexbox (defaults + cascade)
2. RN styles vs CSS stylesheets/selectors
3. `StyleSheet.create` vs a new inline object every render
4. Density-independent units vs CSS `px`/`rem`
5. `position: 'absolute'` in RN vs a mental model of the CSS containing block
6. Safe-area insets vs `paddingTop: 20` hardcoded

## Predict the output

1. Parent `flex: 1`, no `flexDirection`, two children with fixed height. Stacked or side-by-side? Explain.

2. `style={[styles.a, styles.b]}` where both set `marginTop`. Which wins? Explain.

3.

```jsx
<View style={{ color: 'red', fontSize: 18 }}>
  <Text>Hi</Text>
</View>
```

Does Hi look like CSS inheritance? Explain.

4. `borderWidth: StyleSheet.hairlineWidth` — what’s the intent vs `borderWidth: 1`?

## Debugging

1. Web engineer says RN Flexbox is “broken” because items sit in a column. First question?

2. Android: no shadow; they only set `shadowOpacity`. Diagnosis?

3. `memo(Row)` still re-renders every parent tick; `style={{ padding: 8 }}` on Row. Likely cause?

4. Content hidden under the notch; they used `SafeAreaView` only around a tiny inner widget, not the screen. What’s wrong?

## Application

1. Write a `StyleSheet.create` `row` that is a horizontal flex row, vertically centered.

2. Compose `styles.card` with an optional `styles.cardPressed` via array.

3. `Platform.select` shadow: iOS shadowOpacity vs Android `elevation` (dummy numbers).

4. List the five outline bullets from memory.

## Interview questions

1. How does Flexbox differ in RN?  
   **Follow-ups:** cascade? Units? Shadows? StyleSheet.create?

2. Why put font styles on `Text`?

3. How do you handle notches / home indicators?

4. What is Yoga?

5. Is there CSS Grid in RN?

## Connections

1. How does this connect to `View` vs `Text` as host components?
2. How do platform files/`select` show up in shadows?
3. How can Yoga on a huge `ScrollView` tree load the UI thread?
4. How is this *not* Metro or Hermes?
5. How does web flexbox knowledge transfer if you remember the column default?
