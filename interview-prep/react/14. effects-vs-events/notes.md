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

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
