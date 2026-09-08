# Push notification → screen routing — Answers

## Core recall

1. **`type`** (which screen/flow) + **`entityId`** (pointer).
2. **type → action** router; **centralize**; **container ready**; **queue** while bootstrapping.
3. **Payload type + entity id. Central handler waits until nav + auth ready. Typed nested navigate. Same validation as deep links.**
4. **Amount / full DTO / secrets** — **fetch** after open.
5. **Opened / initial** = **tap**. **`onMessage`** = **receive** (foreground).
6. FCM **doesn’t** show a tray item in **foreground**; Notifee **displays**; **press** still goes to the **router**.
7. **`navRef.isReady()` / `onReady`** **and** **hydrated** (and then **auth**).
8. **Queue** the intent; **Auth** if needed; **replay** after.
9. **`messageId`** (and don’t double-bind FCM+Notifee).
10. **Hydrate, queue, nested target, fetch/403, don’t trust extras.**

## Explain why

1. Payload **isn’t** your navigator. **`type`** is a **stable contract**; the app **maps** to **today’s** nested names.
2. One **killed/warm/foreground** path; **no** double `navigate`; **one** nested map.
3. **Receive ≠ user intent.** Would **hijack** the current flow (e.g. Confirm).
4. **`navigate` before ready is dropped.**
5. Process **just started**; **same** as **cold URL** — **no tree yet**.
6. **No `type`/`entityId`** in **data** — nothing to map.
7. **One** nested map **drifts less**; **same** auth/security.
8. **Same** entity can get **two** **legitimate** pushes; **messageId** is **one tap**. Coalesce **entity** only if product wants **one** Details screen.
9. Otherwise the **device** still **receives** **private** events after **session** death.
10. **Anyone** can **forge** a data payload the way they **forge** a URL.

## Compare and contrast

1. **data map** vs **path**; both become **id + type**.
2. **FCM:** deliver + token. **Notifee:** **show** + **press** (esp. foreground).
3. **Incoming** vs **user opened**.
4. **Chrome** vs **router**.
5. **Bootstrap** vs **in-session** tap.
6. **Same gates**; **different OS entry**.
7. **Ready+hydrate** **before** this **dispatch**.
8. **Enter** a screen vs **`reset`** a **completed** flow.

## Predict the output

1. **Details twice** (or **two** pushes on the stack).
2. **Navigate lost** — user lands **default home**.
3. **Pays attacker amount** / **wrong** money UI.
4. **Home** (intent **lost**).
5. **Race** — **wrong** screen or **double** route; **centralize**.
6. **Crash / not handled** — need **fallback**.

## Debugging

1. Add **`getInitialNotification`** (and Notifee initial). **Opened** doesn’t run on **cold**.
2. Routing on **`onMessage`**. Route on **tap** only.
3. **`action not handled`** — **tab-then-screen** from **root/ref**, not HomeStack leaf.
4. **One** `handleNotificationOpen`; **dedupe `messageId`**.
5. **Logout** didn’t **delete token** / **unsubscribe**.
6. **`type` is an enum you map**, not a **raw route name** from the server.

## Application

1. Payload + four bullets + spoken paragraph.
2. `TRANSFER_UPDATE` → `{ name: 'TransfersStack', params: { screen: 'TransferDetails', params: { id: entityId } } }`.
3. Parse → **ready** → **hydrated** → **!auth ? queue : dispatch** → **GET/403**.
4. **…central router, wait, same as links; must not scatter, onMessage-navigate, or trust DTO/amount.**
5. **FCM = transport.** **Notifee = local display/press.**
6. **Map `type`+id → same action (or URL) the linker uses.**

## Interview questions

1. **Spoken:** **type + entity id.** **Central** handler **waits** for **nav + auth**. **Typed nested** action. **Same validation as deep links.**  
   **Follow-up:** **Killed:** `getInitialNotification` + **queue**. **Foreground:** **display** (Notifee); **route on tap**.

2. **Spoken:** **`type` + `entityId`**. Fetch the **document**. **No** trusted **amount**.

3. **Spoken:** **FCM** delivers. **Notifee** **shows** in **foreground** and **press** APIs. **One** function after that.

4. **Spoken:** **One** handler; **messageId**; don’t bind **FCM + Notifee** **both** to **navigate**.

5. **Spoken:** **Same** hydrate/queue/nested/403. Payload is just **another** intent.

## Connections

1. Steps 3–6 of links = **wait / queue / navigate / authorize**.
2. `mapPush` **must** target **TransfersStack** then Details — not a **global** leaf.
3. **`entityId` in params**; **RQ** on the screen.
4. **Robust bullet 3.**
5. **Clear token + listeners** so this handler **isn’t** fed after logout.
