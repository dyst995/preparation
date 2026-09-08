# Code Splitting — Self-test

## Core recall

1. What is code splitting?
2. Why does large JS hurt TTI?
3. What does `React.lazy(() => import(...))` do?
4. What is `Suspense`’s role with lazy components?
5. What is the highest-leverage default split strategy?
6. Name three good component-level split candidates.
7. What export shape does `React.lazy` expect?
8. What is preloading in this context?

## Explain why

1. Why prefer route-based splits before splitting every widget?
2. Why can too many Suspense boundaries feel worse than a bigger initial bundle?
3. Why measure with a bundle analyzer first?
4. Why pair lazy loading with preload on hover?
5. Why doesn’t code splitting replace list virtualization?
6. Why do barrel/`lodash` full imports matter when talking about bundle size?

## Compare and contrast

1. Code splitting vs tree-shaking  
2. Route-based vs component-level splitting  
3. `React.lazy` vs static `import`  
4. One Suspense per route vs Suspense per tiny component  
5. Code splitting vs `React.memo` / runtime memoization  

## Predict / choose

1. First visit `/` — is Settings chunk downloaded if Settings is lazy and unused?  
2. Open PDF modal first time — what does user see if Suspense wraps the lazy modal?  
3. 40 lazy boundaries each with their own spinner on one page load — risk?  
4. Chart library only used on `/analytics` — where should the split live?

## Debugging

1. Error: lazy component / suspended without Suspense. Fix?  
2. `React.lazy(() => import('./X'))` fails; `X` only has `export function X`. Fix?  
3. After deploy, users get chunk load errors on old tabs. Mitigation?  
4. Initial bundle still huge; analyzer shows `recharts` on the main chunk though charts are one route. Cause?

## Application

1. Write lazy + Suspense for a `AdminPanel` route element.  
2. Sketch preload-on-hover for that route’s import.  
3. Spoken answer: reduce initial bundle size.  
4. List a split plan for an app with Home, Dashboard, Settings, and a Monaco editor in Settings only.

## Interview questions

1. How would you reduce a React app's initial bundle size?  
   - Follow-up: What’s the downside of aggressive splitting?  
   - Follow-up: How do you hide lazy-route latency?
2. Explain `React.lazy` and `Suspense`.  
3. Route-based vs component splitting — when each?  
4. How do you decide what to split?

## Connections

1. How does this relate to the chapter’s “measure first” theme?
2. How do Suspense fallbacks relate to perceived performance vs raw TTI?
3. How might waterfalls of lazy chunks resemble request waterfalls (later in the chapter)?
4. How does import hygiene connect to tree-shaking and analyzers?
