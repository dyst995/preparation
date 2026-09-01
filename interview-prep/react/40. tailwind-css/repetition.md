# Tailwind CSS — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is utility-first CSS? Name three reasons teams choose Tailwind.
- [ ] What does mobile-first mean for `md:` utilities? Unprefixed utility vs `lg:` utility.
- [ ] When do you extract a React component for classes vs when is `@apply` appropriate? Why prefer component extraction over default `@apply`?
- [ ] Why isn’t Tailwind the same as inline styles? Why extend the theme instead of raw `bg-[#…]` everywhere?
- [ ] What risk do dynamic class strings pose for purge? Why does purge/content scanning matter for bundle CSS size?

## Predict / debug

- [ ] `className="text-sm md:text-lg"` at a `md` viewport — which text size? State the result and explain why.
- [ ] Same at a viewport below `md`? Why?
- [ ] Padding missing in prod for this class. Diagnose the cause:

```jsx
className={`p-${size}`}
```
- [ ] Repeated identical 15-class string in 8 files. Next refactor? Why?
- [ ] Designer asks to change brand blue everywhere; hex is inlined in 40 files. Prevention?

## Say it out loud

- [ ] Explain Tailwind CSS in 30–60 seconds as if an interviewer asked.
- [ ] What's your philosophy on when to extract a Tailwind utility string into something reusable? Follow-up: `@apply` vs components? Follow-up: is Tailwind just inline CSS?
- [ ] Explain mobile-first breakpoints in Tailwind. Pros and cons of utility-first?
