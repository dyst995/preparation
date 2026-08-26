# Effects vs Events

## What you need to know

This mental model prevents most `useEffect` misuse in reviews and interviews.

| | **Effect** (`useEffect`) | **Event handler** |
| --- | --- | --- |
| Triggered by | Component needing to **stay in sync** with an external system as values change / while mounted | A **specific user interaction** (click, submit, keypress, …) |
| Answers | “What must stay synchronized while we’re showing this / while `id` is X?” | “What should happen when the user does X?” |
| Examples | WebSocket for active room id; `document.title` ↔ state; subscribe to a store | Form submit; analytics on button click; toast right after an action |

**Rule of thumb:** If the story starts with “when the user…”, it’s almost certainly a **handler**, not an effect.

Prerequisites: [useEffect](../12.%20useeffect/notes.md), [StrictMode](../7.%20strict-mode/notes.md).

---

## The decision checklist (preserved)

Ask:

> Does this side effect need to happen because the component is displaying data that depends on some external system, and should **stay synchronized** with it for as long as that’s true?

- **Yes** → effect (subscribe, fetch-by-id, sync title/scroll with current state).  
- **No** — it’s “when the user does X, do Y” → call it **directly in the event handler**.

---

## The most common misuse (preserved)

Using a boolean flag + effect to fake an event:

```jsx
// BAD
function Form() {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) {
      sendAnalytics('form_submitted');
      setSubmitted(false);
    }
  }, [submitted]);

  function handleSubmit() {
    // validate…
    setSubmitted(true); // indirection just to enter the effect
  }
}

// GOOD
function Form() {
  function handleSubmit() {
    // validate…
    sendAnalytics('form_submitted');
  }
}
```

### Why this matters beyond style

Effects re-run when **deps change for any reason**, not only “the click you imagined”:

- StrictMode **remount** → setup runs again → duplicate analytics/toasts.  
- Unrelated state updates that leave a flag truthy.  
- Remount from **key**/navigation.  
- Extra indirection → harder to trace duplicates.

Handlers run **once per interaction** (unless you call them again). Clear causal chain: click → function → side effect.

---

## More examples: effect vs handler

| Scenario | Prefer |
| --- | --- |
| User clicks Save → POST body | **Handler** (`onSubmit`) |
| URL/`userId` prop changes → load that user | **Effect** (or router/loader) — sync UI to id |
| User clicks “Enable notifications” → `Notification.requestPermission` | **Handler** |
| While chat room mounted → keep WS subscribed to `roomId` | **Effect** with cleanup |
| User toggles theme → write `localStorage` | Often **handler** (or effect syncing theme state if theme can change from multiple places — prefer single write site) |
| Show toast after successful submit | **Handler** after `await save()` |
| Keep `document.title` equal to `thread.title` | **Effect** (or set title in the same place you set thread — still “sync display to data”) |

Gray areas exist (e.g. theme written from several code paths). Prefer **one obvious write** in handlers when the trigger is always user action; use effects when the **source of truth is React state/props that can change without that click**.

---

## “But I need async after click”

Still a handler:

```jsx
async function handleSubmit() {
  setPending(true);
  try {
    await api.save(data);
    sendAnalytics('form_submitted');
    toast.success('Saved');
  } finally {
    setPending(false);
  }
}
```

You don’t need `submitted` state solely to unlock an effect. Loading flags are fine as state; the **side effects tied to the click** stay in the handler.

---

## Fetch: effect or event?

| | |
| --- | --- |
| Search-as-you-type / detail page for `id` in the URL | Often **effect** (or framework data API) — UI must match current id |
| Submit search button / Save form | **Handler** |

Putting “POST on submit” in an effect via a flag is the anti-pattern above. Putting “GET when `userId` changes” in an effect is synchronization.

---

## Why effects feel attractive (and why to resist)

- “All side effects go in useEffect” — outdated teaching.  
- Wanting to keep handlers “pure” — handlers are the right place for interaction side effects.  
- Copy-paste from tutorials that overuse effects.

Correct purity rule: **render** stays pure; **handlers and effects** are where the world gets touched — pick the one that matches the trigger.

---

## Common mistakes and misconceptions

1. Flag + effect for click analytics / toasts / navigation.  
2. Treating every network call as “must be an effect.”  
3. Believing handlers can’t be `async`.  
4. Using effects to chain “step 2 after step 1 state update” when both belong in one handler.  
5. Ignoring StrictMode double-firing as a signal that event logic was misplaced in an effect.

---

## Connections to other concepts

```
user did X
  → event handler (direct)

props/state must match external system
  → useEffect (+ cleanup)

StrictMode remount
  → punishes event-logic-in-effects (duplicates)

submitted flag anti-pattern
  → extra state + indirect control flow
```

---

## Interview perspective

**Q: Example of using `useEffect` when a handler was correct — why is that a problem?**

Preserved answer:

> Firing analytics by setting a boolean in a click handler and watching it in `useEffect` — that’s “on click, log,” an event, not synchronization. Effects add indirection, extra state, and risk of re-firing on remounts (StrictMode) or unrelated dep churn → duplicate events. Call the side effect directly in the click handler.

Also ready: decision checklist; fetch-by-id vs submit-POST distinction.

---

# Self-test

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
