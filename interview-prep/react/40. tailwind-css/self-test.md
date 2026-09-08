# Tailwind CSS — Practical Patterns — Self-test

## Core recall

1. What is utility-first CSS?
2. Name three reasons teams choose Tailwind.
3. What does mobile-first mean for `md:` utilities?
4. When do you extract a React component for classes?
5. When is `@apply` appropriate?
6. Why extend the theme instead of raw `bg-[#…]` everywhere?
7. Why isn’t Tailwind the same as inline styles?
8. What risk do dynamic class strings pose for purge?

## Explain why

1. Why does co-location reduce context-switching?
2. Why prefer component extraction over default `@apply`?
3. Why do constrained spacing/color scales improve consistency?
4. Why does `flex-col md:flex-row` match mobile-first?
5. Why can long class strings still be OK inside a `PrimaryButton`?
6. Why does purge/content scanning matter for bundle CSS size?

## Compare and contrast

1. Tailwind utilities vs classic BEM/`btn-primary` CSS  
2. Component extraction vs `@apply`  
3. `theme.extend` tokens vs arbitrary values  
4. Tailwind variants vs inline `style={{}}`  
5. Unprefixed utility vs `lg:` utility  

## Predict / interpret

1. `className="text-sm md:text-lg"` at a `md` viewport — which text size?  
2. Same at a viewport below `md`?  
3. `hover:bg-blue-700` — can inline styles express this as cleanly?  
4. Repeated identical 15-class string in 8 files — next refactor?

## Debugging

1. `className={`p-${size}`}` — padding missing in prod. Cause?  
2. Designer asks to change brand blue everywhere; hex is inlined in 40 files. Prevention?  
3. Team complains JSX is unreadable; every page pastes the same button classes. Fix?  
4. Someone added `.btn { @apply … }` for every variant and now jumps CSS constantly. Critique?

## Application

1. Write a Tailwind button with padding, primary bg, hover, disabled styles.  
2. Write a responsive stack→row container.  
3. Sketch `theme.extend.colors.brand`.  
4. Spoken extraction philosophy answer.

## Interview questions

1. What's your philosophy on when to extract a Tailwind utility string into something reusable?  
   - Follow-up: `@apply` vs components?  
   - Follow-up: Is Tailwind just inline CSS?
2. Explain mobile-first breakpoints in Tailwind.  
3. How do you keep a large team visually consistent with Tailwind?  
4. Pros and cons of utility-first?

## Connections

1. How do `flex` / `grid` utilities connect to the flex/grid study units?
2. How does component extraction fit React’s composition model?
3. How do design tokens relate to theming / rebranding?
4. How does mobile-first Tailwind mirror mobile-first CSS media queries?
