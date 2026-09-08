# Deep linking and universal links — Answers

## Core recall

1. **`myapp://transfers/123` → AppTabs → TransfersStack → TransferDetails(id=123)`.** **`https://app.example.com/qr` → QR payment flow.**
2. Open → parse → **wait if !hydrated** → **queue + login** if !auth → **navigate** if auth → **validate permissions**.
3. **OS opens with a URL. Linking config maps paths to the navigator tree. Prefixes, paths, params. Private screens: hydrate + authorization before navigating.**
4. **Android `adb shell am start` + intent URI; iOS `xcrun simctl openurl` or universal-link setup. Cold, warm, logged-out.**
5. **Scheme:** app-claimed `myapp://`. **Universal/App Links:** verified **https** host; **browser** if app missing.
6. **`NavigationContainer`**. Nested **`screens`** = **navigator tree**.
7. **Wait** (splash). **Don’t** pick Auth vs App from the URL yet.
8. **Store intended URL**, show **Auth**, **continue** after login.
9. **Authorize** the resource (API) — URL is **not** permission.
10. **Cold**, **warm**, **logged out** (plus invalid/403 if you named those).

## Explain why

1. Paths address **nested** names. Flat config **doesn’t** name **tabs/stacks**.
2. The **correct tree isn’t mounted**. You’ll **flash** private UI or **miss** the route.
3. Login **would drop** intent. Queue **replays** the same parse after **App** exists.
4. Association proves **this app may open**. **Not** that **this user** owns transfer 123.
5. **Any** app can **register** `myapp://`. **https** needs **domain files**.
6. Query strings are **attacker-controlled**. **Server** is authority.
7. **Cold** uses **initial URL**; **warm** uses a **new** event. Bugs are **often** one and not the other.
8. Typos and old emails exist. **Crash** is worse than **Home/NotFound**.
9. Pays the **attacker’s** amount. **Quote/fetch** instead.
10. After login, navigating to **arbitrary** `next` can leave **your** app **or** hit an **unsafe** path.

## Compare and contrast

1. **Unverified scheme** vs **verified https** + web fallback.
2. **Killed process** vs **already running**.
3. **Tree-shaped** map vs **leaf-only** (breaks nesting).
4. **Auth xor App** then replay vs **Details on Auth** (wrong tree).
5. **OS trust of the file** vs **your** 403/404.
6. **Id in the URL** vs **how** the URL **gets** to a screen.
7. **When** to resolve vs **how** Auth/App **swap**.
8. **URL** vs **FCM data**; **same** hydrate + id + authorize.

## Predict the output

1. **Not handled** or **wrong** Root screen — config **doesn’t match** the tree.
2. **Private flash** / **not handled** / bounce to Login. **Gate failed**.
3. **Default App home** — **intent lost**.
4. **Shows Victim’s name** from the URL — **PII lie**. Must **403 fallback**.
5. **Logged-out cold** users **never** resume the email link.
6. **Crash / blank** — no **unhandled** path.

## Debugging

1. **AASA / assetlinks** (and **intent filters**) for **https**. Scheme-only doesn’t make **emails** open the app.
2. **Nest** `AppTabs → TransfersStack → TransferDetails`.
3. Linking **before** `hydrated` (or treating `!hydrated` as logged out **then** swapping).
4. **Didn’t persist/replay** the intended URL.
5. **Trusting** query **to/amount**; **auto-submit**. **Id + fetch**; **user confirm**.
6. **Prefixes / associated domains** per [flavor](../20.%20flavors-config/notes.md) host.

## Application

1. Map + six steps + both spoken paragraphs.
2. `prefixes: ['myapp://', 'https://app.example.com']`; `AppTabs.screens.TransfersStack.screens.TransferDetails: 'transfers/:id'`.
3. Open/parse/wait/queue-or-nav/authorize/fallback.
4. Scheme OK for **dev/local**; **https** for **email**; **amount** not trust; **id** OK as **pointer**.
5. Cold, warm, logged-out, **403**, **typo**.
6. **…wait for hydrate + auth + server authorize; must not trust query money or skip the queue.**

## Interview questions

1. **Spoken:** OS opens a URL. **Linking** maps **path patterns** onto the **navigator tree**. Prefixes, paths, params. Private: **hydrate + authorization**.  
   **Follow-up:** Config **nests**; `transfers/:id` under the **tab stack**, not a flat Root.

2. **Spoken:** Android **`adb shell am start`** + URI. iOS **`xcrun simctl openurl`** / universal-link setup. **Cold, warm, logged-out**.  
   **Follow-up:** Queue on logged-out; **initial URL** vs **live** subscribe.

3. **Spoken:** **Store** the URL, **AuthStack**, after login **replay**. Don’t navigate Details **on** Login.

4. **Spoken:** **`id` is a pointer** — still **GET + 403**. **`amount` is never truth**. Don’t auto-pay.

5. **Spoken:** **Fallback** Home/NotFound. Don’t crash.

## Connections

1. Each **indent** in IA is an **indent** in `config.screens`.
2. Step 3 **is** the hydration gate applied to **getInitialURL**.
3. Navigate with **`:id`**, then **RQ**; **403** = fallback.
4. Two containers → **two** linking worlds; **one** URL **lost**.
5. **Central router**: type + **entityId** → **same** nested navigate + **same** gates.
