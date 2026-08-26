# Effects vs Events — Answers

## Core recall

1. **Effect:** stay in sync with an external system as state/props require. **Handler:** respond when the user does a specific thing.
2. Does this need to stay synchronized with an external system while displayed / while some value holds? If yes → effect; if it’s “when user does X” → handler.
3. Set a boolean in the handler; `useEffect` watches the boolean to run the real side effect.
4. StrictMode remount (or other remounts) re-runs the effect → duplicate side effects.
5. **Handler.**  
6. **Effect** (with cleanup).  
7. **Handler.**  
8. **Effect** (or set title wherever you set `post` — still syncing display to data, not “on click”).

## Explain why

1. The trigger is an interaction, not “keep X synchronized while rendered.”
2. Deps change, remounts, StrictMode, parent re-creation of identities — not only your intended click path.
3. Stack traces and control flow point at the click; no hidden second phase.
4. Dev remount re-fires effects that wrapped one-shot event work → duplicates you wouldn’t want in prod remounts either.
5. Handlers can be `async`; awaiting in the click path keeps causality clear.
6. **Id change** means the UI must match a new resource (sync). **Submit** is a discrete user command (event).

## Compare and contrast

1. Value/mount-driven sync vs interaction-driven response.  
2. Ongoing alignment vs one-shot reaction.  
3. Indirect, stateful, re-fire-prone vs direct call.  
4. Loading state for UI is fine; using it only as an effect trigger for the main action is the smell.  
5. Effect: N runs over lifetime. Handler: typically 1:1 with gestures.

## Predict the behavior

1. Effect can run on remount → **duplicate** analytics if `submitted` path runs again.  
2. **Once** per submit call.  
3. **Yes** — and it should, if the page must show that user.

## Debugging

1. Event logic in an effect — move `sendAnalytics` into the click/submit handler; don’t rely on a flag effect.  
2. Yes — or StrictMode double effect; prefer handler after await.  
3. Ask which calls are user-triggered vs id/sync-driven; move POSTs/submits to handlers.  
4. `navigate()` in the login handler after success (or router API), not `loggedIn` effect.

## Application

1.
```jsx
function handleSubmit() {
  // validate…
  sendAnalytics('form_submitted');
}
```

2. (a) effect (b) handler (c) effect (or loader)  
3.
```jsx
async function handleSubmit() {
  await api.save(data);
  toast.success('Saved');
}
```
4. “Is this sync-with-external-system, or when-user-did-X?”

## Interview questions

1. **Spoken:** Boolean `submitted` + effect for analytics — should be click handler. Problems: indirection, extra state, remount/dep duplicates. Fix: call analytics in the handler.  
   **Follow-ups:** StrictMode double-invoke; same for toasts.

2. **Spoken:** Checklist — sync while true / value changes → effect; user gesture → handler.

3. **Spoken:** No — fetch-by-changing-id often effect; submit/save often handler.

4. **Spoken:** Side effects also belong in handlers; effects are for synchronization, not all side effects.

5. **Spoken:** One-shot event work runs once per gesture instead of on every effect re-run/remount.

## Connections

1. Narrows “external system” to ongoing sync — not every side effect.  
2. Remount re-runs effects → duplicates for event-shaped work.  
3. Render stays pure; handlers are allowed (and expected) to touch the world on interaction.  
4. Same idea: delete effects that only exist to react to a click flag.  
5. User changes `id` via click → navigation updates prop → **effect** loads new id — the effect syncs to props; the click handled navigation, not the fetch itself.
