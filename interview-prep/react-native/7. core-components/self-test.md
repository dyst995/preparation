# Components map to native views — Self-test

## Core recall

1. What is a RN **host** / core component versus a composite (e.g. a UI-kit `Button`)?
2. What is `View` for, and can it contain a raw string?
3. Why must strings live in `Text`?
4. Why nest `Text` inside `Text` (not only `View` + `Text`)?
5. `ScrollView` vs `FlatList` — what does each do with children?
6. How do you load a **local** image vs a **remote** one?
7. Why prefer `Pressable` over `TouchableOpacity` in new code?
8. What is `TextInput`’s usual change callback name (`onChange` vs `onChangeText`)?

## Explain why

1. Why is `View` not a 1:1 `div`?
2. Why is `ScrollView` + `.map` of 500 rows a problem even if “it works on my phone”?
3. Why doesn’t `style={{ color: 'red' }}` on a `View` style the inner `Text` like CSS?
4. Why can a screen reader suffer if you shatter one sentence into many tiny `Text`s?
5. Why isn’t a third-party `Card` a substitute for knowing `View`/`Text` in a perf interview?
6. Why is `TouchableNativeFeedback` a weak default for a cross-platform screen?

## Compare and contrast

1. `View` vs `Text`
2. `ScrollView` vs `FlatList`
3. `Pressable` vs `TouchableOpacity`
4. Core component vs composite
5. `require('./x.png')` vs `{ uri }`
6. Web `onClick` / `<button>` vs RN press primitives

## Predict the output

1. Does this run?

```jsx
<View>Hello</View>
```

2. 200 feed items inside `ScrollView` `.map`. What mounts? What’s the failure mode?

3.

```jsx
<View style={{ color: 'gray' }}>
  <Text>Hi</Text>
</View>
```

Is the text gray like a CSS parent color? Explain.

4. `TouchableNativeFeedback` wrapping a row, iOS + Android. What do you expect on iOS vs Android?

## Debugging

1. Redbox about text being a child of `View`. Fix?

2. Feed stutters; they memoized `Row` but still wrap the list in `ScrollView`. What’s the real issue?

3. Design-system `Button` “is slow.” They want to rewrite it in native. What do you inspect first?

4. Local `Image` `source="logo.png"`. What’s wrong?

## Application

1. Rewrite a web `<div>Save</div>` to RN primitives.

2. Sketch a one-line inline “terms **link**” using nested `Text`.

3. When would you still choose `ScrollView` over `FlatList`?

4. Write a `Pressable` that changes opacity while pressed (`style` as a function) — shape only.

## Interview questions

1. How do RN core components map to native views?  
   **Follow-ups:** Why `Text`? ScrollView vs FlatList? Pressable?

2. Why doesn’t every web HTML element have an RN twin?

3. What’s the difference between core components and a component library?

4. How would you implement a paragraph with a tappable word?

5. Why prefer virtualized lists for long data?

## Connections

1. How does this catalog sit on “same React, different host”?
2. How does ScrollView-of-everything load the **UI thread**?
3. How does Metro `require` for images connect to `Image`?
4. How will Yoga/StyleSheet change `View` layout without changing which **host** you pick?
5. How does FlatList (later) refine this unit without replacing it?
