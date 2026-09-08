# Push notification → screen routing — Self-test

## Core recall

1. Recite the payload convention (`type`, `entityId`).
2. Recite the four-bullet robust approach.
3. Recite the spoken “open a screen from a notification” answer.
4. What should the router **not** take as authority (`amount`, full DTO)?
5. Foreground vs background vs killed — which is **tap-to-open** vs **message received**?
6. Why **Notifee** in foreground if you already have FCM?
7. What must be **true** before `navRef.navigate`?
8. What do you do if the tap happens **during splash** / logged out?
9. How do you **dedupe** (what id)?
10. What do you **reuse** from deep links?

## Explain why

1. Why **`type` + id** instead of a **screen name** string in the payload?
2. Why **centralize** instead of FCM listeners in each screen?
3. Why **not** navigate on every **foreground `onMessage`**?
4. Why **queue** until `NavigationContainer` **onReady**?
5. Why killed-state **`getInitialNotification`** is a **cold-start** problem like `getInitialURL`?
6. Why FCM **notification-only** (no **data**) cannot route?
7. Why map push → **same nested action** (or even the **same URL parse**) as links?
8. Why dedupe **messageId**, not **only** `entityId` in all cases?
9. Why **logout** must drop the **FCM token** / listeners?
10. Why **403** after opening TransferDetails still applies to **push**?

## Compare and contrast

1. Push `data` vs deep-link **URL**.
2. FCM vs Notifee (job of each).
3. `onMessage` vs **opened** / **initial** handlers.
4. Foreground display vs **tap** routing.
5. Queue (bootstrap) vs **immediate** navigate (app ready + authed).
6. This unit vs [deep linking](../38.%20deep-linking/notes.md).
7. This unit vs [auth flow](../35.%20auth-flow-patterns/notes.md).
8. This unit vs next **resets** (enter a screen vs **clear** a flow).

## Predict the output

1. Foreground `onMessage` **and** Notifee **onPress** both call `navigate('TransferDetails')` with **no** dedupe. User taps once. Stack?

2. Killed tap: `handleNotificationOpen` runs **before** `onReady`. No queue. Result?

3. Payload `{ type: 'TRANSFER_UPDATE', entityId: '1', amount: '99999' }`. Screen **sends** that amount on mount. Harm?

4. Logged-out killed tap; you **don’t** queue. User logs in. Land?

5. Two handlers: Home `onNotificationOpenedApp` → Wallet; App `getInitialNotification` → Details. Cold start. Result?

6. `type: 'UNKNOWN'`. No fallback. Result?

## Debugging

1. Taps work **warm**, never **cold**. You subscribed `onNotificationOpenedApp` only. Diagnose.

2. Every chatty **balance** push **steals** the current screen while using the app. Diagnose.

3. Review: `navigation.navigate('TransferDetails', { id })` from FCM in **HomeStack**. Symptom class?

4. Double Details push; FCM **and** Notifee **initial** both fire. Fix?

5. After logout, user still gets **private** pushes that **open** Wallet. What’s missing?

6. Router uses `data.title` as **route name**. What’s wrong?

## Application

1. Recite payload, robust bullets, spoken answer.

2. Sketch `mapPush`: `TRANSFER_UPDATE` → nested `TransfersStack` / `TransferDetails` / `{ id }`.

3. Write `handleNotificationOpen` order: parse → ready → hydrate → auth? queue : dispatch → validate.

4. PR rule: “Push routing must … must not …”

5. List FCM vs Notifee **one** responsibility each.

6. One-line: how this **combines** with linking.

## Interview questions

1. How do you open a specific screen from a notification?  
   **Follow-up:** Killed state? Foreground?

2. What goes in the payload? Why not the full object?

3. FCM vs Notifee — who does what?

4. How do you avoid navigating twice?

5. How is this the same as deep links?

## Connections

1. How does [deep-link sequence](../38.%20deep-linking/notes.md) map onto this handler?
2. How does [nested tab-then-screen](../34.%20nested-nav-architecture/notes.md) show up in `mapPush`?
3. Why [params vs fetch](../37.%20params-vs-fetch/notes.md) still applies to `entityId`?
4. Why [container `onReady`](../33.%20nav-building-blocks/notes.md) is on the robust list?
5. What does [logout](../29.%20auth-session/notes.md) add that this router **assumes**?
