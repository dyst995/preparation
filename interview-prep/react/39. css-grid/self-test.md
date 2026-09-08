# CSS Grid Mental Model — Self-test

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
