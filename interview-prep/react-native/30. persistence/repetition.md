# Persistence — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Persist-OK vs do-not-plain table. Spoken answer. Keychain/Keystore for tokens. Don’t persist RQ money.
- [ ] Zustand persist: async race, partialize, version/migrate. Nav waits on **session** hydrate, not theme.
- [ ] Logout: wipe vault+RQ, keep theme. `hasHydrated` ≠ session `hydrated`. MMKV speed ≠ vault.
- [ ] Failed migrate → defaults, don’t crash. `AsyncStorage.clear()` is blunt.

## Predict / debug

- [ ] Persist blob has `accessToken`; backup extracted. Auth persist rehydrates after App mounted as logged-out. Old `{ dark: true }` vs new `theme`, no migrate.
- [ ] Logout clears RQ+memory but persist still has token. `partialize` omitted; txs in wallet store. Bootstrap awaits theme persist forever.
- [ ] Login flash: persist `isAuthenticated` vs Keychain. White screen on `JSON.parse`. Entire `useAuthStore` persisted. Logout resets language. PAN in MMKV.

## Say it out loud

- [ ] What do you persist, and where? Follow-up: Zustand persist caveats?
- [ ] How do you avoid navigation racing rehydration? Versioning? Keychain vs AsyncStorage vs MMKV?
- [ ] Recite the spoken persist answer (prefs / vault / version / bootstrap).
