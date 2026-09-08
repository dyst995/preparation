# Push notification → screen routing

## What you need to know

[Deep linking](../38.%20deep-linking/notes.md) already **queued** intents until **hydrate** and **authorized** the resource. This unit is the **same router** fed by a **push payload** instead of a URL.

**Learn:**

- Payload conventions: **`type`**, **`entityId`**
- Taps in **foreground / background / killed**
- **Deduplicating** navigation actions
- Combining with **deep-link** infrastructure
- **Notifee / FCM** interaction points

**Robust approach (preserve):**

- Small router: `notification.type → navigation action`
- **Centralize** (don’t scatter `navigate` in every push handler)
- **`NavigationContainer` ready** before navigating
- **Queue** if the app is still bootstrapping

**Q: How do you open a specific screen from a notification?**

> The notification payload carries a type and entity id. A central handler waits until navigation and auth are ready, maps that payload to a typed navigation action, and routes into the correct nested screen. I reuse the same validation rules as deep links.

**Resets** after payment/logout are **next**. This unit is **how a tap becomes a nested navigate**.

---

## Payload: `type` + `entityId` (not a DTO)

**Convention:** data payload is a **small** map the **router** understands.

```ts
type PushData = {
  type: 'TRANSFER_UPDATE' | 'KYC_STATUS' | 'RECEIPT';
  entityId: string;
};
```

**Why:** same as [params vs fetch](../37.%20params-vs-fetch/notes.md). The OS/FCM **must not** carry a **full transfer** or **amount to trust**. `type` picks the **screen**; **`entityId`** is the **pointer**; the screen **fetches**.

**Don’t** put `navigate: 'Confirm'` **strings** that **bypass** the router, or **`amount`** the UI **submits**.

**FCM split:** **notification** key = **system tray** copy (title/body). **data** key = **your** `type`/`entityId` (always **strings**). Router reads **data**. If you only send a **notification** blob with **no data**, you **cannot** route.

---

## Three process states (tap ≠ receive)

| App state | Typical APIs | What you must do |
| --- | --- | --- |
| **Foreground** | FCM `onMessage`; **Notifee** display + **press** | OS often **doesn’t** show a tray item. **Display** via Notifee; **navigate on tap**, not on **every** `onMessage` (unless product wants an **in-app** banner **only**). |
| **Background** | FCM `onNotificationOpenedApp` / Notifee **press** | User **tapped the tray**. **Route**. |
| **Killed** | `getInitialNotification()` (FCM and/or Notifee) | Same as **cold-start URL**: **queue** until **ready + hydrated**. |

**Receive** in foreground is **not** a tap. Navigating **Wallet** on every **balance ping** is a **hijack**. **Open** handlers are the **intent**.

**Killed + also a `link` in the notification:** FCM **and** `getInitialURL` can **both** fire → **dedupe**.

---

## FCM vs Notifee (interaction points)

**FCM (Firebase):** **delivery**, **device token**, **data** messages, **opened** / **initial** notification. Token **refresh**; **logout** **deletes** token / **unsubscribes** ([auth-session](../29.%20auth-session/notes.md)).

**Notifee:** **local display**, **channels**, **foreground** presentation, **press** events, **initial** notification if **you** displayed it.

**Typical glue:**

```text
FCM onMessage (foreground)
  → Notifee.displayNotification({ data: { type, entityId } })
Notifee / FCM *Opened / getInitial*
  → the SAME handleNotificationOpen(data)
```

**Don’t** `navigation.navigate` inside `onMessage` **and** again in Notifee **onPress** for the **same** message.

---

## Central router + ready + queue

Scatter (`HomeScreen` FCM listener, `Wallet` another) → **double navigate**, **missed** killed state, **wrong** nested target.

```ts
function mapPush(data: PushData) {
  switch (data.type) {
    case 'TRANSFER_UPDATE':
      return { name: 'TransfersStack', params: { screen: 'TransferDetails', params: { id: data.entityId } } };
    default:
      return null; // fallback Home
  }
}

async function handleNotificationOpen(data: PushData) {
  const action = mapPush(data);
  if (!action) return fallbackHome();
  await whenNavReady();          // container onReady / navRef.isReady()
  await whenHydrated();         // same gate as deep links
  if (!isAuthenticated) {
    queueIntent(action);         // replay after login
    return;
  }
  navRef.dispatch(CommonActions.navigate(action));
  // then: same 403/404 validation as links
}
```

**Ready:** `navigate` **before** `onReady` is **lost**. **Queue** bootstrap intents ([auth flow](../35.%20auth-flow-patterns/notes.md) / [deep links](../38.%20deep-linking/notes.md)).

**Reuse deep-link rules:** nested **tab-then-screen**, **fetch by id**, **don’t trust** payload money, **fallback** on unknown `type`.

You **can** map `type` → **`myapp://transfers/:id`** and **reuse** `linking` **parse** — **one** infrastructure. Don’t **fork** two nested maps that **drift**.

---

## Deduping navigation

Same tap can fire **two** APIs; **killed** can deliver **initial notification + data message**; retries can **replay** `messageId`.

**Dedupe on:** FCM **`messageId`** (or Notifee **notification id**) **once per process**, plus **don’t enqueue** the same `{ type, entityId }` **twice** in 1s.

**Don’t** treat **two** transfers as duplicates — key is **message id**, not **only** `entityId` (two **different** pushes for the **same** tx might still be **one** screen; that’s **OK** to coalesce).

---

## Common mistakes and misconceptions

- **`navigate` in every FCM `onMessage`.**
- **No `type`/`entityId`** — only a title.
- **Navigate before `onReady` / `hydrated`.**
- **Scatter** handlers per screen.
- **Trust** payload **amount** / **DTO**.
- **FCM vs Notifee both** route **without** dedupe.
- **Logout** leaves the **token** registered.
- Answering **Notifee vs FCM** when they asked **how you wait for auth**.

---

## Connections to other concepts

`payload (type, id) → queue until ready+auth → same nested action as links → fetch+403`

- **[Deep links](../38.%20deep-linking/notes.md):** **same** sequence; **URL vs data map**.
- **[Nested nav](../34.%20nested-nav-architecture/notes.md):** **tab then screen**.
- **[Auth](../35.%20auth-flow-patterns/notes.md):** **don’t** open Details on **AuthStack**.
- **[Auth session](../29.%20auth-session/notes.md):** **stop listeners** / drop token on logout.
- Next: **reset** after a flow — **not** how you **enter** from a tap.

---

## Interview perspective

They want **type + id**, **central wait**, **nested**, **same as links**. Spoken answer **is** the Q. Follow-up: **killed**; **FCM vs Notifee**; **dedupe**.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
