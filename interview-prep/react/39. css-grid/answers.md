# CSS Grid — Answers

## Core recall

1. Grid is 2D (rows + columns together); Flex is 1D (one main axis).  
2. Makes direct children grid items in a grid formatting context.  
3. The column/row **tracks** (sizes and structure).  
4. A flexible fraction of free space in that dimension.  
5. Declarative named regions you assign with `grid-area`.  
6. As many columns ≥200px as fit, each growing with `1fr` — responsive packing.  
7. `grid-area: name;` matching a name in `grid-template-areas`.  
8. Single-axis UIs: toolbars, navs, simple centering, one row/column of controls.

## Explain why

1. You must size and place regions on both axes as one shell — classic 2D.  
2. The template is an ASCII map of the UI — easy to explain and maintain.  
3. Column count becomes a function of container width via track min size.  
4. Flex wrap doesn’t define a full row/column track matrix or named 2D regions.  
5. `1fr` row eats leftover viewport height so main expands between auto header/footer.  
6. Dimensionality matches the problem at each nesting level.

## Compare and contrast

1. **Grid:** 2D tracks/placement. **Flex:** 1D distribution.  
2. **Areas:** named, readable shells. **Lines:** precise spans without names.  
3. **Fixed:** constant size. **fr:** share remaining free space.  
4. **auto-fill:** responsive count. **repeat(3):** always three tracks.  
5. **gap:** built-in gutters. **margins:** easy to uneven/first-last hassle.

## Predict / sketch

1. The `1fr` column.  
2. Spans **both** columns (full width).  
3. **Two** (200+200 ≤ 450; third won’t fit with gaps depending — ~2).  
4. **Invalid** / broken — rows must match column count.

## Debugging

1. Area rows must each have the same number of cells as columns.  
2. Items auto-place in order; without areas/spans you may not get the intended shell — define areas or explicit placement.  
3. `repeat(auto-fill, minmax(200px, 1fr))` (or similar).  
4. `minmax(0, 1fr)` / min-size overrides so the track/item can shrink (like flex `min-width: 0`).

## Application

1.
```css
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
```

2. Match preserved dashboard: 2 cols, 3 rows, areas header/sidebar/main/footer.  
3. Paraphrase preserved interview answer.  
4. `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));`

## Interview questions

1. **Spoken:** Use Grid for real 2D layouts (page shell, card matrix); Flex for 1D. Areas read like a diagram. Follow-ups: dashboard areas; auto-fill minmax cards.  
2. **Spoken:** Fraction of leftover space in the track sizing dimension.  
3. **Spoken:** `repeat(auto-fill, minmax(min, 1fr))` + gap.  
4. **Spoken:** Yes — grid for structure, flex inside cells for 1D chrome.

## Connections

1. Flex notes deferred 2D to Grid — this is that tool.  
2. Both say “take a share of free space,” but `fr` is track-level in a 2D template.  
3. Same property name/role: space between adjacent items/tracks.  
4. Semantic elements map cleanly onto named areas (`header`, `main`, …) for a11y + layout together.
