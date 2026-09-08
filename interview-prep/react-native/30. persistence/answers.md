# Persistence — Answers

## Core recall

1. **OK:** theme, language, non-sensitive UI flags. **Not plain:** tokens; PAN/CVV/secrets; raw financial payloads if avoidable.
2. **Prefs casually; tokens/secrets → secure storage; version persist; rehydrate in bootstrap so nav doesn’t race.**
3. **Tokens and secrets** (and anything **catastrophic** if extracted).
4. **Async rehydrate / nav race; serializing secrets; no version; (PII in the blob).**
5. **Write only safe fields** to disk — exclude tokens/txs.
6. **Old JSON → new shape** without crashing.
7. **Token / session** vault — **not** theme.
8. **No** — avoid persisting that PII; **refetch**.
9. **Yes** (usually).
10. **Plain:** AsyncStorage/MMKV. **Secure:** Keychain / Keystore.

## Explain why

1. **Backup, sandbox, root/jailbreak** — not OS-protected like Keychain.
2. **`persist` writes the object you give it** — “auth store” doesn’t encrypt.
3. First frame uses **initialState**; then persist **snaps** — **Login then Home** (or reverse).
4. **Wrong stack** vs **wrong palette**. Only **session** gates **trees**.
5. **Ledger on disk** = **PII** at rest, backups, leftover after logout if you forget that key.
6. App updates **change shape**; old blobs **mismatch**.
7. **White screen** on launch is worse than **reset prefs**.
8. Wipes **language/theme** **or** **misses** the **token** key if it’s **elsewhere**.
9. **Default MMKV is fast K/V**, not Keystore. **Encryption** is **opt-in**.
10. **Auth flash / PII** vs **cosmetic**.

## Compare and contrast

1. **Casual disk** vs **vault**.
2. **Convenience JSON** vs **OS secret APIs**.
3. **Prefs ready** vs **tokens read** — **don’t alias**.
4. **Client id** (mild) vs **server PII list**.
5. **OK** vs **PCI-ish / secret**.
6. Logout **wipes vault + RQ**; **may keep** theme persist.
7. **Bundle** vs **device**. Both **not** for refresh tokens.
8. **Memory** (gcTime) vs **disk**. Don’t **promote** RQ to AsyncStorage.

## Predict the output

1. **Token leak** from backup — **privileged session**.
2. **Login flash** then App (or bounce).
3. **`theme` undefined** / crash / wrong branch — **no migrate**.
4. **Still logged in** (token **survived** on disk).
5. **Financial JSON** in plain storage — **do-not-plain** column.
6. **Long splash** / hang — you waited on the **wrong** hydrate.

## Debugging

1. **Gated on persist default**, not **Keychain**. Wait on **secure** hydrate; **partialize** auth **out** of persist.
2. **`version` + `migrate`**; on throw **wipe blob**.
3. **`partialize`** **no tokens**; tokens **only** secure storage.
4. Logout **`clear()`d all AsyncStorage** including **i18n** key.
5. **PAN in plain (or fast) disk.** **Don’t persist**; tokenize / **don’t** store PAN.
6. **Return defaults** / **reset**; **don’t** `undefined` the store.

## Application

1. Table + spoken paragraph.
2. `name: 'ui-prefs'`, `version: 1`, `partialize: theme + hasSeenOnboarding`.
3. Theme/lang/`hasSeenTip` → plain. Refresh/CVV → vault. Balance JSON → **don’t**.
4. **Nav waits on secure session hydrate, not theme persist.**
5. **…partialize secrets out, version, not be the session source of truth.**
6. **Wipe:** tokens, RQ. **Keep:** theme/language (usually).

## Interview questions

1. **Spoken:** Non-sensitive UI prefs casually. Tokens/secrets → **secure storage**. **Version** persist; **rehydrate in bootstrap** so **nav doesn’t race**.  
   **Follow-up:** **`partialize`**; never persist **txs**; persist ≠ vault.

2. **Spoken:** Splash until **Keychain** read; **don’t** mount stacks off Zustand **defaults**. Theme can apply **late**.

3. **Spoken:** `version` + **`migrate`**; failed migrate → **defaults**, don’t crash.

4. **Spoken:** **Keychain/Keystore** = secrets. **AsyncStorage** = prefs. **MMKV** = **fast** prefs, **not** automatically a vault.

5. **Spoken:** **Theme/language** OK. **Tokens and RQ money** gone.

## Connections

1. Session unit: **reset path**. This unit: **which keys are prefs vs vault**.
2. Splash = **session**; theme persist is **optional** parallel.
3. Middleware **is** how prefs hit disk; **partialize/version** are **this** unit.
4. **Compile-time** public config ≠ **device** secrets.
5. Optimistic = **in-memory cache** during a **mutation**. Persist = **across launches**.
