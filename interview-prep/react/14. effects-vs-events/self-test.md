# Effects vs Events — Self-test

## Core recall

1. What question does an effect answer vs an event handler?
2. What is the decision checklist sentence for choosing an effect?
3. Sketch the `submitted` flag anti-pattern in one sentence.
4. Why can that anti-pattern double-fire analytics in development?
5. Click → toast: effect or handler?
6. `roomId` changes → resubscribe WebSocket: effect or handler?
7. Form POST on Save click: effect or handler?
8. Keep `document.title` in sync with `post.title`: effect or handler (typical)?

## Explain why

1. Why is “when the user clicks” a hint against `useEffect`?
2. Why do effects re-fire for reasons other than the original click?
3. Why is direct handler code easier to debug than flag + effect?
4. Why can StrictMode expose misplaced event logic?
5. Why is async work in a handler still not a reason to move it into an effect?
6. Why might fetch-on-`id`-change be a legitimate effect while fetch-on-submit is not?

## Compare and contrast

1. Effect vs event handler (trigger and purpose)  
2. Sync-with-external-system vs respond-to-interaction  
3. `setSubmitted(true)` indirection vs calling `sendAnalytics` in `handleSubmit`  
4. Loading state in a handler vs using loading state only to trigger an effect  
5. Remount-driven effect runs vs one click one handler run  

## Predict the behavior

1. BAD Form with `submitted` effect + StrictMode initial remount while `submitted` somehow true — risk?  
2. GOOD handler `sendAnalytics` on submit — how many times per click (normally)?  
3. Effect `[userId]` loads user; user clicks nothing but `userId` prop changes — does load run? Should it?

## Debugging

1. Duplicate `purchase` analytics in React 18 StrictMode only. Code uses flag + effect. Diagnosis?  
2. Toast appears twice on one save. Suspect event-in-effect?  
3. Engineer moved all API calls into `useEffect` “for consistency.” What do you challenge?  
4. Navigation after login done via `setLoggedIn` + effect `navigate()`. Better approach?

## Application

1. Rewrite the BAD Form analytics example to the GOOD version.  
2. Classify: (a) subscribe to `window` resize while mounted (b) button opens modal (c) URL `?q=` changes refetch.  
3. Write an async `handleSubmit` that saves then toasts — no submission effect.  
4. One-sentence checklist you’ll use in code review when you see `useEffect`.

## Interview questions

1. Give an example of using `useEffect` when a handler was correct — and why that’s a problem.  
   **Follow-ups:** StrictMode? Fix?

2. How do you decide between an effect and an event handler?

3. Is data fetching always an effect? Explain.

4. What’s wrong with “all side effects belong in useEffect”?

5. How does this model reduce duplicate toasts/analytics bugs?

## Connections

1. How does this refine the useEffect unit’s “external system” definition?
2. How does StrictMode double-mount interact with this anti-pattern?
3. How does render purity still hold if handlers do side effects?
4. How do you relate this to “you might not need an effect” guidance?
5. When would an effect still run after a user action indirectly (legitimately)?
