# 01. How React Native differs from React on the web

> Source: `interview-prep/react-native/01-fundamentals.md`

### Core idea

React (web) reconciles a virtual DOM and commits to the browser DOM (`div`, `span`, etc.).

React Native reconciles a React tree and commits to **native host views**:
- iOS: `UIView`, `UILabel`, `UIScrollView`, �
- Android: `View`, `TextView`, `ScrollView` / `RecyclerView`-backed lists, �

You still write React components, hooks, and JSX. The **host** is different.

### What this means in interviews

- There is no real browser DOM, no CSS cascade as on web, no `window`/`document` in the same way.
- Styling is mostly a constrained Flexbox + Yoga layout system, not full CSS.
- Navigation is not URL-first by default (unless you add linking).
- Many web libraries that touch DOM will not work; you need RN-compatible alternatives.

### Answer sketch

> �React Native uses React�s reconciliation, but instead of updating the DOM it updates native views through a renderer. Components like `View` and `Text` map to platform primitives. That�s why we get native look-and-feel and platform APIs, but we must think about the JS/native boundary, threading, and mobile constraints.�

---
