# Deep linking and universal links — Self-test

## Core recall

1. Recite the mental map for `myapp://transfers/123` and the `https://…/qr` line.
2. Recite the six auth + deep-link steps.
3. Recite “How do deep links work in RN?”
4. Recite “How do you test deep links?”
5. Custom **scheme** vs **universal / App Links** — one line each.
6. Where does **`linking`** live, and what must `config.screens` **match**?
7. What happens if **not hydrated** when the URL arrives?
8. What happens if **not authenticated**?
9. What is **step 6** after navigate?
10. Name three test **scenarios** besides “happy path while logged in.”

## Explain why

1. Why must the linking **config nest** like the navigator tree?
2. Why wait for **hydrate** before resolving a **private** link?
3. Why **queue** the URL instead of dropping it when logged out?
4. Why doesn’t **HTTPS** mean the user **may see that transfer**?
5. Why is a custom scheme **weaker** against spoofing than App Links?
6. Why **fetch + 403/404** instead of rendering **query-string** fields?
7. Why test **cold** and **warm** separately?
8. Why an **invalid path** needs a **fallback**, not a crash?
9. Why `?amount=` on a pay link must **not** be authority?
10. Why `?next=` after login is an **open-redirect** risk?

## Compare and contrast

1. `myapp://` vs `https://` universal / App Links.
2. Cold start (`getInitialURL`) vs warm (`subscribe` / new intent).
3. Nested `screens` config vs a **flat** path map.
4. Queue + login vs **navigate** into Details **while** on AuthStack.
5. Prefix **association** vs **API authorization**.
6. This unit vs [params vs fetch](../37.%20params-vs-fetch/notes.md).
7. This unit vs [auth flow](../35.%20auth-flow-patterns/notes.md) (links vs **tree swap**).
8. This unit vs next **notification** routing (URL vs payload).

## Predict the output

1. Flat config: `TransferDetails: 'transfers/:id'` at Root; real screen under `AppTabs → TransfersStack`. Open `myapp://transfers/123`. Logged in, hydrated.

2. URL arrives during splash (`!hydrated`). Linking **immediately** tries AppTabs. Logged-out user. First screens?

3. Logged out; you **don’t** store the URL; user logs in. Where do they land?

4. Authenticated; `GET /transfers/123` returns **403**. You **only** mapped the path and showed Details with **params from the URL** (`?name=Victim`). UI?

5. `adb` only tested **warm + logged in**. **Cold + logged out** never queued. Production bug?

6. Path `/trasnfers/123` (typo). No fallback screen. Result?

## Debugging

1. Links work in debug scheme, **https** emails open **Safari** only. What association is missing?

2. `action not handled` on a valid-looking `transfers/:id`. Config **flat**. Diagnose.

3. Users report **Login flash** then Details every email link. Diagnose the **gate**.

4. After login, always **Home**, never the transfer. What’s missing in step 4?

5. Review: pay link `myapp://pay?to=IBAN&amount=100`. Screen **submits** on mount. What’s wrong?

6. Universal link works on **one** flavor (prod host) not **staging**. Flavors/config angle?

## Application

1. Recite map, six steps, both spoken Qs.

2. Sketch `linking` `prefixes` + nested `TransferDetails: 'transfers/:id'`.

3. Write the six-step sequence as a **checklist** for a PR.

4. Classify: scheme for local QR; `https` receipt email; `amount` query; `id` path.

5. Test plan: three launches + one **403** + one **typo path**.

6. PR rule: “Private links must … must not …”

## Interview questions

1. How do deep links work in RN?  
   **Follow-up:** Nested navigators?

2. How do you test deep links?  
   **Follow-up:** Logged out? Cold vs warm?

3. How do you handle a link when the user is **logged out**?

4. Security: can you trust `id` / `amount` in the URL?

5. What if the path doesn’t match any screen?

## Connections

1. How does [nested IA](../34.%20nested-nav-architecture/notes.md) **dictate** `config.screens`?
2. How does [auth hydrate](../35.%20auth-flow-patterns/notes.md) **slot into** step 3?
3. Why [params vs fetch](../37.%20params-vs-fetch/notes.md) is **step 6’s** partner?
4. Why [one NavigationContainer](../33.%20nav-building-blocks/notes.md)?
5. What will [§7](../04-navigation.md) **reuse** from this unit?
