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

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
