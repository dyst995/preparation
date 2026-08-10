# 06. Effects vs events - the mental model that resolves most useEffect misuse

> Source: `interview-prep/react/02-hooks-deep-dive.md`

This is one of the most valuable mental models for both interviews and real code review.

| | **Effect** (`useEffect`) | **Event handler** |
|---|---|---|
| Triggered by | A value changing / component syncing with the outside world | A specific user interaction (click, submit, keypress) |
| Answers | "What does this component need to *stay in sync with* as long as it's rendered/some value changes?" | "What should happen when the user does X?" |
| Example | Subscribing to a WebSocket while a chat room ID is active; syncing `document.title` to a state value | Submitting a form; sending an analytics event on a specific button click; showing a toast right after an action |

### The most common misuse: putting event-response logic in an effect

```jsx
// BAD: using an effect to react to a "submission" that's really an event, not a sync-with-external-system need.
function Form() {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) {
      sendAnalytics('form_submitted');   // this is really "when the user submits, do X" - an event, not a sync
      setSubmitted(false);
    }
  }, [submitted]);

  function handleSubmit() {
    // ...validate...
    setSubmitted(true);   // indirect trigger just to get into the effect
  }
}

// GOOD: call it directly in the event handler - simpler, no extra state, no effect indirection, no risk
// of the effect firing again for unrelated reasons that also happen to leave `submitted` truthy.
function Form() {
  function handleSubmit() {
    // ...validate...
    sendAnalytics('form_submitted');
  }
}
```

**Why this matters beyond style:** effects run whenever their dependencies change, for *any* reason - not just the one you had in mind. An effect that's really "respond to this specific click" can accidentally re-fire due to unrelated re-renders, remounts (see `StrictMode` double-invoke), or dependency changes triggered elsewhere, producing duplicate side effects (double analytics events, duplicate toasts, etc.) that are hard to trace back to the root cause.

### Decision checklist

Ask: **"Does this side effect need to happen because the component is displaying data that depends on some external system, and should stay synchronized with it for as long as that's true?"**
- Yes -> effect (e.g., subscribe to a store, fetch data based on an ID, sync scroll position).
- No, it's "when the user does X, do Y" -> event handler, called directly from the interaction callback.

### Interview question

**Q: Give an example of using `useEffect` when a plain event handler would have been correct - and why is that a problem?**

> "A common one is firing an analytics event by setting a boolean state in a click handler and having a `useEffect` watch that boolean to fire the analytics call. It's really just 'on click, log an event' - an event, not something needing synchronization. The effect version adds indirection, extra state, and risk: the effect can re-fire due to remounts (like StrictMode's dev double-invoke) or unrelated dependency churn, producing duplicate analytics events that are hard to trace. The fix is calling the side effect directly inside the click handler."

---
