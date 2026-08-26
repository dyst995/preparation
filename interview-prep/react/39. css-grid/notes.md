# CSS Grid Mental Model

## What you need to know

**CSS Grid** is a **two-dimensional** layout system: you define **rows and columns together** and place items into cells (or named areas). **Flexbox** is **one-dimensional** (one main axis; wrap is still “a wrapping line,” not a full 2D track system).

Reach for Grid when you need a **page shell**, **dashboard**, or **responsive card matrix**. Reach for Flex for toolbars, nav rows, centering one cluster, or distributing items along a single axis.

They compose: grid for page structure, flex inside a cell for a toolbar.

Prerequisites: [Flexbox](../38.%20flexbox/notes.md).

---

## When Grid beats Flexbox (preserved)

| Flexbox | Grid |
| --- | --- |
| One dimension (row *or* column) | Rows **and** columns at once |
| Great for nav, lists, centering | Great for page/dashboard shells, card grids |
| Items flow in a line (optionally wrap) | Explicit tracks + placement / areas |

Interview line: wrapping flex is not the same as controlling both axes with `grid-template-*` and named regions.

---

## Core container properties (preserved + expanded)

| Property | Controls |
| --- | --- |
| `display: grid` | Grid formatting context for direct children |
| `grid-template-columns` | Column **tracks** (sizes) |
| `grid-template-rows` | Row tracks |
| `gap` | Gutters between tracks (`row-gap` / `column-gap`) |
| `grid-template-areas` | Named regions — ASCII-like layout map |

### Track sizing you must know

| Value | Meaning |
| --- | --- |
| `240px` | Fixed track |
| `1fr` | One share of **free** space in that dimension |
| `auto` | Size to content (roughly) |
| `minmax(min, max)` | Clamp track between min and max |
| `repeat(n, …)` | Repeat a track definition `n` times |
| `repeat(auto-fill, minmax(200px, 1fr))` | As many ≥200px columns as fit; responsive without MQ |

`fr` distributes leftover space **after** fixed/`auto`/minmax mins are accounted for — same *spirit* as flex-grow, but in a 2D track list.

---

## Named areas — dashboard recipe (preserved)

```css
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
}
.header {
  grid-area: header;
}
.sidebar {
  grid-area: sidebar;
}
.main {
  grid-area: main;
}
.footer {
  grid-area: footer;
}
```

```text
header  | header
--------+-------
sidebar | main
--------+-------
footer  | footer
```

Each string row must have the **same number of cells** as columns. A name spanning two columns (`header header`) merges that item across those tracks.

This is why interviewers love `grid-template-areas`: the CSS **reads like the layout**.

---

## Responsive card grid without media queries (preserved)

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

- **`minmax(200px, 1fr)`** — each column at least 200px, can grow equally.  
- **`auto-fill`** — create as many such columns as fit in the container width.  
- Narrow viewport → fewer columns; wide → more — **no breakpoint list required** for this pattern.

`auto-fit` vs `auto-fill`: both pack columns; `auto-fit` collapses empty tracks so items can stretch into leftover space. For interviews, knowing `auto-fill` + `minmax` is the headline; mention `auto-fit` if asked about collapsing empties.

---

## Placement without areas (bonus fluency)

```css
.item {
  grid-column: 1 / 3; /* start line 1, end line 3 → spans 2 columns */
  grid-row: 2;
}
```

Grid has **lines** between tracks (for 2 columns, lines 1–3). `span 2` is alternate syntax. Areas are usually clearer for page shells; line-based placement is fine for one-off spans.

---

## Alignment in Grid (quick)

On the container:

- `justify-items` / `align-items` — default alignment of items **in their cells** (inline vs block axis).  
- `justify-content` / `align-content` — when the **whole grid** is smaller than the container, position the grid tracks.

Don’t confuse with Flex’s justify/align — similar names, grid’s “items vs content” split matters when the grid doesn’t fill the box.

---

## Combining Grid and Flex

```text
page (grid: header / sidebar / main)
  main cell
    toolbar (flex: space-between)
    cards (grid: auto-fill minmax)
```

Use the tool that matches dimensionality at each level.

---

## Interview answer (preserved)

**Q: When would you reach for Grid instead of Flexbox?**

> “When the layout is genuinely two-dimensional — I need to control rows and columns together, like a page shell with a header, sidebar, main content, and footer, or a card grid that wraps responsively. Flexbox is one-dimensional; it’s great for a single row or column of items (a toolbar, a list, centering a single element), but coordinating both axes at once with named regions is where Grid is the clearly better, more declarative tool — `grid-template-areas` reads almost like an ASCII diagram of the layout.”

---

## Common mistakes and misconceptions

1. Using nested flex hacks for a full page shell when Grid areas are clearer.  
2. Unequal number of tokens in `grid-template-areas` rows.  
3. Forgetting `min-height` / `1fr` row so “main fills viewport” fails.  
4. Thinking flex-wrap equals Grid.  
5. Overusing Grid for a simple horizontal button group (Flex is enough).  
6. Mixing up `auto-fill` card grids with needing media queries for that pattern.  
7. `1fr` on a child that needs `minmax(0, 1fr)` to allow shrinking below content size (overflow issues — same family as flex `min-width: 0`).

---

## Connections to other concepts

```
Flex 1D distribution
  → toolbar, nav, center

Grid 2D tracks + areas
  → page shell, dashboard

auto-fill + minmax
  → responsive cards without MQ

gap
  → same idea as flex gap

fr
  → free-space shares in a track list
```

---

## Interview perspective

Be ready to:

1. Grid vs Flex decision in one sentence.  
2. Sketch `grid-template-areas` dashboard.  
3. Explain `repeat(auto-fill, minmax(...))`.  
4. What `1fr` means.  
5. When you’d still use Flex inside a grid cell.

---

# Self-test

## Core recall

1. How is Grid’s dimensionality different from Flexbox?
2. What does `display: grid` do?
3. What do `grid-template-columns` / `rows` define?
4. What is `1fr`?
5. What does `grid-template-areas` give you?
6. What does `repeat(auto-fill, minmax(200px, 1fr))` achieve?
7. How do you assign an element to a named area?
8. When is Flex still the better tool?

## Explain why

1. Why is a page with header/sidebar/main/footer a Grid problem?
2. Why do named areas help readability and interviews?
3. Why can `minmax(200px, 1fr)` remove some media queries for card grids?
4. Why isn’t flex-wrap a substitute for Grid tracks?
5. Why might `main` use `1fr` in `grid-template-rows` with `min-height: 100vh`?
6. Why compose Grid (page) + Flex (toolbar)?

## Compare and contrast

1. CSS Grid vs Flexbox  
2. `grid-template-areas` vs line-based `grid-column`  
3. Fixed `240px` track vs `1fr` track  
4. `auto-fill` vs hard-coded `repeat(3, 1fr)`  
5. `gap` in Grid vs margins between cards  

## Predict / sketch

1. Two columns `240px 1fr` — which grows when the window widens?  
2. Areas row `"header header"` with two columns — how wide is header?  
3. Card grid `auto-fill minmax(200px, 1fr)` at ~450px wide container — about how many columns?  
4. Three area strings with different cell counts — valid?

## Debugging

1. `grid-template-areas` ignored / broken layout; strings have 3 then 2 names. Cause?  
2. Sidebar and main stacked oddly; only set `grid-template-columns` but not areas/placement. What might be wrong?  
3. Cards stay one column forever despite wide screen; used `repeat(3, 200px)` only. Better pattern?  
4. Grid child content overflows and won’t shrink. Familiar fix family?

## Application

1. Write a 2-column equal grid with `gap: 24px`.  
2. Recreate the dashboard areas snippet from memory (structure only).  
3. Spoken: Grid vs Flex when to choose.  
4. Write a responsive product card grid CSS one-liner columns definition.

## Interview questions

1. When would you reach for Grid instead of Flexbox?  
   - Follow-up: Show a `grid-template-areas` example.  
   - Follow-up: Explain `auto-fill` + `minmax`.
2. What does `fr` mean?  
3. How do you make a responsive card grid without breakpoints?  
4. Can you use Grid and Flex together?

## Connections

1. How does this section complete the Flex chapter’s “1D vs 2D” hint?
2. How is `1fr` conceptually similar to `flex: 1`?
3. How does `gap` unify Flex and Grid spacing?
4. How do semantic landmarks (`header`, `main`, `nav`) pair with grid areas in a page shell?
