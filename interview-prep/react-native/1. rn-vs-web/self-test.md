# How React Native differs from React on the web — Self-test

## Core recall

1. What stays the same between React web and React Native, and what changes?
2. What does “host” mean in this comparison?
3. What do `View` and `Text` map to, at interview level, on iOS and Android?
4. Is React Native a WebView wrapping a website?
5. Name three browser things you do **not** have in RN the same way as on web.
6. How is styling different from web CSS in one sentence (cascade / engine)?
7. Is navigation URL-first by default in RN?
8. Why do many “works with React” npm packages fail in RN?

## Explain why

1. Why can you keep using hooks and JSX if there is no DOM?
2. Why does “native look and feel” follow from the host being platform views, not from JSX looking like HTML?
3. Why must strings sit inside `<Text>` in RN when a web `div` can contain raw text?
4. Why does a library that calls `document.querySelector` break in RN even if it “uses React”?
5. Why does the JS/native boundary appear in a *host* discussion even before the Bridge chapter?
6. Why is “we reconcile a virtual DOM to the DOM” a sloppy sentence for RN?

## Compare and contrast

1. `react-dom` commit vs RN renderer commit
2. `<div>` / `<span>` vs `<View>` / `<Text>`
3. CSS cascade + `className` vs RN `style` / StyleSheet
4. React Router (URL) vs typical RN navigation
5. Optional `WebView` component vs “the app is a WebView”
6. Pure JS libraries (e.g. Zod) vs `react-dom` / DOM CSS-in-JS

## Predict the output

1. Does this compile/run in RN? What goes wrong?

```jsx
function Hello() {
  return <View>Hello</View>;
}
```

2. Parent uses `style={{ color: 'gray' }}` on a `View` wrapping `<Text>Hi</Text>`. Does the text become gray the way a CSS parent color would on web? Explain.

3. You `import { createPortal } from 'react-dom'` in an RN screen. What happens conceptually?

4. A teammate writes `<div className="card">` in a `.tsx` file that Metro bundles for iOS. What fails — JSX syntax, or the host component?

## Debugging

1. A web engineer says: “RN is slower because the virtual DOM has to go through a WebView.” Diagnose the misconception.

2. A screen imports a UI kit that uses `document.body` for modals. Dev build crashes or no-ops. Where is the layer mismatch?

3. Layout looks “row-like on web but stacked on RN” with the same `display: 'flex'` mental model and no `flexDirection`. What’s the default trap?

4. Product wants “share this screen URL.” The app uses React Navigation stacks only. What web assumption leaked?

## Application

1. Rewrite this web snippet to RN primitives (structure only):

```jsx
<div className="box">
  <span>Save</span>
</div>
```

2. In two sentences, explain to a web-only engineer why `react-router-dom` is the wrong default for a native app.

3. List three checks before adding an npm React library to an RN app.

4. Write the one-line pipeline: React → ? → host, for web and for RN.

## Interview questions

1. How does React Native render UI compared to React on the web?  
   **Follow-ups:** Is it a WebView? What are `View`/`Text`? Why don’t DOM libraries work?

2. What do you mean by “the host is different”?

3. What web skills transfer, and what do you have to relearn?

4. Why must we think about the JS/native boundary if “it’s still just React”?

5. How would you answer someone who says RN is “HTML and CSS on the phone”?

## Connections

1. How does the web virtual-DOM / element-tree idea still apply if there is no DOM?
2. How does render vs commit still hold when commit does not call DOM APIs?
3. How does this unit set up the Bridge / Fabric discussion without replacing it?
4. How does “no CSS cascade” connect to Yoga / StyleSheet (later in this chapter)?
5. How did this split show up when you used the same React Query / Zustand / hooks knowledge on RN apps (EasyPay, MyCreditInfo, …)?
