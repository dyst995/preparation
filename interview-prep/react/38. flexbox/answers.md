# Flexbox — Answers

## Core recall

1. `flex-direction` (and writing mode / reverse).  
2. `justify-content`.  
3. `align-items`.  
4. Direct children of the flex container (they become flex items).  
5. Grow to take a share of free space (shorthand ~ `1 1 0%`) — equal share among `flex: 1` siblings.  
6. Don’t grow, don’t shrink, basis 240px — fixed main size.  
7. Allows items to move onto additional flex lines when they don’t fit.  
8. `row`.

## Explain why

1. In a column, main axis is vertical — `justify-content` operates vertically.  
2. Parent has no definite height — cross-axis centering has no space to center within.  
3. Gap spaces between items without first/last margin hacks and works with wrap.  
4. Default `min-width: auto` prevents shrinking below content; `0` allows shrink/truncate.  
5. Flex only formats direct children; grandchild’s parent must be the flex container.  
6. Explicitly locks grow/shrink so the item doesn’t participate in free-space fights; communicates intent in flex layout.

## Compare and contrast

1. **justify:** main. **align-items:** cross.  
2. **align-items:** all items. **align-self:** one item override.  
3. **grow:** extra space factor. **basis:** starting size before distribute.  
4. **between:** space only between items. **around:** half-ish space at ends too (evenly differs).  
5. **Flex:** 1D distribution. **Grid:** 2D rows+columns tracks.

## Predict / sketch

1. First at main-start, last at main-end, middle spaced between.  
2. Centered on main (vertical); cross-start (left in LTR).  
3. **Main** takes leftover.  
4. Yes — equal flex shares of content area (gap consumes space between).

## Debugging

1. `justify-content: center` for horizontal (main) in a row.  
2. `flex-direction: column` (or width constraints forcing wrap/stack).  
3. `min-width: 0` (and overflow/ truncation as needed) on the flex child.  
4. `justify-content: space-between` on the flex navbar.

## Application

1.
```css
.page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
```

2.
```css
.layout { display: flex; }
.sidebar { flex: 0 0 280px; }
.main { flex: 1; min-width: 0; }
```

3. Paraphrase preserved answer + mention parent height.  
4. `display: flex; flex-wrap: wrap; gap: 8px;` on container.

## Interview questions

1. **Spoken:** Parent `display: flex; justify-content: center; align-items: center;` (row default). Column: same properties but axes swap meaning. Sidebar: `flex: 0 0 Npx`, main `flex: 1`.  
2. **Spoken:** Basis = start size; grow shares free space; shrink shares deficit when overflowing.  
3. **Spoken:** justify = main axis; align-items = cross axis — depends on direction.  
4. **Spoken:** Flex for one row/column of distribution (nav, toolbar, sidebar+main); grid when you need full 2D alignment.

## Connections

1. People memorize “justify = horizontal” — false once direction is column.  
2. Main: `space-between`; cross: `align-items: center` for vertical centering in a row nav.  
3. Gap is first-class spacing between flex/grid items — cleaner than margin collapse tricks.  
4. Media query switches `flex-direction` to column to stack the same items on small screens.
