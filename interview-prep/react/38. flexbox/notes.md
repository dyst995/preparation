# Flexbox Mental Model

## What you need to know

**Flexbox** lays out a container’s **direct children** along a **main axis** and a **cross axis**. `flex-direction` chooses which physical direction is main; alignment properties follow those axes — not “always horizontal/vertical.”

Master:

1. Main vs cross  
2. Container props (`justify-content`, `align-items`, `wrap`, `gap`)  
3. Item props (`flex-grow` / `shrink` / `basis`, `flex: 1`, `align-self`)  
4. A few recipes (center, navbar, sidebar + main)

Grid is for **two-dimensional** layouts; flex is ideal for **one-dimensional** rows/columns and distribution of space along one axis. (Grid may appear later in this chapter.)

---

## Main axis and cross axis

```text
flex-direction: row (default)
  main  →  horizontal (left → right in LTR)
  cross →  vertical

flex-direction: column
  main  →  vertical (top → bottom)
  cross →  horizontal
```

`-reverse` flips main-start/main-end.

**Critical interview habit:**  
- **`justify-content`** → **main** axis  
- **`align-items`** → **cross** axis  

When direction is `column`, “centering vertically” is `justify-content`, not `align-items`.

---

## Container properties (preserved)

| Property | Controls |
| --- | --- |
| `display: flex` | Flex formatting for **direct** children |
| `flex-direction` | `row` \| `column` \| `*-reverse` — defines main axis |
| `justify-content` | Main-axis distribution: `flex-start`, `center`, `space-between`, `space-around`, `space-evenly`, `flex-end` |
| `align-items` | Cross-axis: `flex-start`, `center`, `stretch` (default), `baseline`, `flex-end` |
| `flex-wrap` | `nowrap` (default) \| `wrap` — extra lines when items don’t fit |
| `gap` | Space between items (`row-gap` / `column-gap`) |

Only **direct** children become flex items. Nested grandchildren are not flex items of the outer container unless that nested parent is also a flex container.

`align-items: stretch` — items stretch on the cross axis if they don’t have a fixed cross size (common default that surprises people who set width/height oddly).

---

## Item properties (preserved)

| Property | Controls |
| --- | --- |
| `flex-grow` | Share of **extra** free space (proportional to grow factors) |
| `flex-shrink` | How much to shrink when overflow (proportional) |
| `flex-basis` | Starting size before grow/shrink (often like preferred width/height along main) |
| `flex: 1` | Common shorthand ≈ `1 1 0%` — grow equally from zero basis (“equal share of space”) |
| `align-self` | Override container `align-items` for one item |

Mental model for distribution:

```text
1. Start from flex-basis (or content size if auto)
2. If free space left → distribute by flex-grow
3. If overflow → shrink by flex-shrink
```

`flex: 1` on siblings → they split remaining main-axis space evenly (after gaps/fixed siblings).

`flex: 0 0 240px` → fixed 240px track: don’t grow, don’t shrink.

Note: exact `flex: 1` expansion to `0%` vs `0` is a common shorthand; interview answer “grow to fill equally” is enough — the recipe `flex: 1` is the idiom.

---

## Common layout recipes (preserved)

```css
/* Horizontal nav: ends apart, vertically centered */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Perfect center (default row) */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
/* Parent needs a height (or fills viewport) or vertical center is invisible */

/* Sidebar fixed + main fills rest */
.layout {
  display: flex;
}
.sidebar {
  flex: 0 0 240px;
}
.main {
  flex: 1;
  min-width: 0; /* often needed so children can shrink/truncate instead of blowing the row */
}

/* Equal-width columns */
.columns {
  display: flex;
  gap: 16px;
}
.column {
  flex: 1;
}
```

---

## Centering gotchas

```css
.center {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh; /* or height: 100% chain */
}
```

Without a definite cross-axis size on the parent, `align-items: center` may look like “nothing happened.”

With `flex-direction: column`, swap which property does vertical vs horizontal centering:

```css
.center-column {
  display: flex;
  flex-direction: column;
  justify-content: center; /* vertical (main) */
  align-items: center; /* horizontal (cross) */
}
```

---

## Wrap and gap

`flex-wrap: wrap` + `gap` builds responsive chip rows / card rows without negative margin hacks.

On wrapped rows, `align-content` (not `align-items`) distributes **flex lines** in the cross axis when there’s extra space — less common in interviews but useful when multiple rows don’t fill height.

---

## Interview answer (preserved)

**Q: How do you perfectly center a div both horizontally and vertically with Flexbox?**

> “`display: flex; justify-content: center; align-items: center;` on the parent centers the child along both the main axis (`justify-content`) and cross axis (`align-items`), assuming the default `flex-direction: row`.”

Add aloud: parent needs a height for the vertical centering to be visible.

---

## Common mistakes and misconceptions

1. Swapping `justify-content` and `align-items` (especially with `column`).  
2. Expecting flex to layout non-direct descendants.  
3. Centering without parent height.  
4. Forgetting `min-width: 0` / `min-height: 0` on nested flex children so text overflow/truncation works.  
5. Using flex for a full page **grid** of rows *and* columns when CSS Grid is clearer.  
6. `space-between` with one item (item goes to start — no “between”).  
7. Confusing `flex-basis` with `width` when both set (flex algorithm interacts; prefer understanding basis + grow).

---

## Connections to other concepts

```
flex-direction
  → defines main/cross
  → reinterpret justify vs align

flex-grow/shrink/basis
  → how free space is shared
  → sidebar + main, equal columns

gap
  → replaces margin hacks between items

CSS Grid (later)
  → 2D tracks; flex = 1D distribution
```

---

## Interview perspective

Be ready to:

1. Define main/cross from `flex-direction`.  
2. Center with flex (+ height caveat).  
3. Sidebar + `flex: 1` main.  
4. Explain `flex: 1` vs `flex: 0 0 Npx`.  
5. Navbar `space-between` + `align-items: center`.

---

# Self-test

## Core recall

1. What do main axis and cross axis depend on?
2. Which property aligns along the main axis?
3. Which property aligns along the cross axis?
4. What does `display: flex` apply to?
5. What does `flex: 1` roughly mean?
6. What does `flex: 0 0 240px` mean?
7. What does `flex-wrap: wrap` do?
8. Default `flex-direction`?

## Explain why

1. Why does `justify-content: center` center vertically when `flex-direction: column`?
2. Why might flex centering appear to fail vertically?
3. Why use `gap` instead of margins on every child?
4. Why set `min-width: 0` on a `flex: 1` main pane with long content?
5. Why isn’t a grandchild a flex item of the outer flex container?
6. Why is `flex: 0 0 240px` better than only `width: 240px` for a fixed sidebar in a flex row?

## Compare and contrast

1. `justify-content` vs `align-items`  
2. `align-items` vs `align-self`  
3. `flex-grow` vs `flex-basis`  
4. `space-between` vs `space-around`  
5. Flexbox vs CSS Grid (one sentence each)

## Predict / sketch

1. Row flex; three items; `justify-content: space-between` — where do they sit?  
2. Column flex; `justify-content: center; align-items: flex-start` — child position?  
3. Two children: sidebar `flex: 0 0 200px`, main `flex: 1` — who takes leftover width?  
4. Equal columns all `flex: 1` with `gap: 16px` — equal content boxes?

## Debugging

1. Tried to center with only `align-items: center` on a row; still left-aligned horizontally. Missing?  
2. Navbar items stacked vertically unexpectedly. Check what?  
3. Long word overflows flex main and blows the layout. Likely fix?  
4. “Cancel” and “Save” stuck together; wanted space between ends. Missing?

## Application

1. Write CSS for viewport-centered login card.  
2. Write sidebar 280px + fluid main.  
3. Spoken: center a div with flexbox.  
4. Build a wrap chip list with `gap: 8px`.

## Interview questions

1. How do you perfectly center a div both horizontally and vertically with Flexbox?  
   - Follow-up: What if `flex-direction` is `column`?  
   - Follow-up: Sidebar + content layout?
2. Explain `flex-grow`, `flex-shrink`, and `flex-basis`.  
3. What’s the difference between `align-items` and `justify-content`?  
4. When would you choose flex over grid?

## Connections

1. How does `flex-direction` remapping explain “I mixed up justify and align”?
2. How do navbars combine `space-between` with vertical centering?
3. How does flex `gap` relate to modern layout vs older margin tricks?
4. How might this connect to responsive “stack on mobile” (`flex-direction: column`)?
