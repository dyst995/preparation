# Navigation performance and UX — Answers

## Core recall

1. **Jank is often screen render weight, not the navigator. Profile the screen first.**
2. **Lazy tabs; detach/freeze; don’t mount huge trees on first paint; header/custom header cost.**
3. **First mount** of a tab until **first focus**.
4. **No** — it **stays mounted** unless **unmountOnBlur** (etc.).
5. **Freeze:** pause **updates** on blur, **keep** state. **Unmount:** **destroy** the tree; **remount** next time.
6. **Native views** of inactive screens.
7. **All** heavy roots **run** at login — **TTI**.
8. **Native** header.
9. **Profile the screen. Lazy tabs. Freeze/detach heavy inactive. Native headers unless custom is worth JS.**
10. **No** — **list/header** still **dominate**.

## Explain why

1. Lazy only **delays first** mount. **Return** visits are still **mounted** → **focus**, not remount.
2. **Remount = `useEffect` again** = **you paid** a **full** mount **every switch**.
3. **Keep** scroll/filters; **stop** **re-rendering** while **away**.
4. **JS thread** + **TTI**; users **haven’t** opened those tabs.
5. **Layout/commit** of the **bar** **every frame** of the **transition**.
6. **Navigator swap** **won’t** shrink a **500-row** **ScrollView**.
7. **Network + parse + setState** on **trees** the user **doesn’t** see **yet**.
8. **Mount cost** **already paid** at login; **switch** is **cheap** — **login** was **slow**.
9. **React state** can **remain**; **native** layer **detached**.
10. **JS** on **every** push vs **one** **native** bar.

## Compare and contrast

1. **Defer first mount** vs **destroy on leave**.
2. **Pause updates** vs **destroy tree**.
3. **Native chrome** vs **JS tree**.
4. **Login/TTI** vs **later** **tab tap**.
5. **Usually small** vs **your** **Wallet**.
6. **Stay mounted** (focus) vs **opt-in** **unmount/lazy**.
7. **Native default** **includes** **cheap header**; JS stack **not** a **jank fix**.
8. **Windowing** **is** **screen weight**.

## Predict the output

1. **Four** (all tab roots).
2. **No.**
3. **No** (already mounted).
4. **Yes.**
5. **JS thread** — **custom header** (and body).
6. **Still jank** — **ScrollView**.

## Debugging

1. **`lazy: true`**; **thin** initial tab.
2. **Freeze** Wallet; **narrow** store **selectors**; **profile** Wallet **renders**.
3. **Unmount dropped** instance state. **Freeze** instead.
4. **Profile the header**; **native** title if possible.
5. **Profile Confirm/header/list first.** JS stack **last**.
6. **Freeze ≠ remount.** Need **`useFocusEffect` refetch** (or invalidate).

## Application

1. Interview sentence + four topics + spoken paragraph.
2. **`lazy: true`;** no **`lazy: false`** “for snappy tabs” without a **TTI** budget.
3. **Freeze** (keep scroll). **Unmount** only if **memory** **forces** it.
4. Lazy = **first paint**. Freeze = **inactive CPU**. Detach = **native memory**. Unmount = **remount**. Custom header = **JS bar**.
5. **One** branded surface, **measured**; not **every** stack screen.
6. **Record** Wallet **render**; **check** **lazy** and **header** before **navigator** rewrite.

## Interview questions

1. **Spoken:** **Usually the screen**, not the navigator. **Profile** Wallet/list/header **first**.  
   **Follow-up:** **Systrace**, **list virtualization**, **header**, **how many tabs mount**.

2. **Spoken:** **`lazy` tabs**; **only** the **initial** tab **heavy**; **defer** other tab **data**.

3. **Spoken:** **Freeze** to **keep state** and **cut** **background** **renders**. **Unmount** if the tree is **too** **big** to **keep** — **pay** remount.

4. **Spoken:** **Fat JS headers** on **push**. **Native** header **default**.

5. **Spoken:** **Lazy** = **first** mount **later**. **After** that, **still mounted** → **useFocusEffect**. **UnmountOnBlur** is the **exception**.

## Connections

1. **First** `useEffect` **shifts** to **first focus**. **Returns** still **§9**.
2. **Native header** is **cheap**; custom is **this** unit’s **cost**.
3. **Windowing** **fixes** “nav jank” **more** than **stack type**.
4. **Defer** non-critical **init** = **don’t** **wake** **all** tabs.
5. **Bank** is **whole-chapter** **Qs**; this is **lazy/freeze/headers**.
