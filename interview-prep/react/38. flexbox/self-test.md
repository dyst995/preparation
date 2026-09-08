# Flexbox Mental Model — Self-test

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
