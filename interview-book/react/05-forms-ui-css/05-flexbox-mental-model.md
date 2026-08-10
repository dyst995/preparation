# 05. Flexbox mental model

> Source: `interview-prep/react/05-forms-ui-css.md`

### The core mental model

Flexbox lays out children along a **main axis** and a **cross axis**, determined by `flex-direction`.

| Property (on container) | Controls |
|---|---|
| `display: flex` | Turns on flex layout for direct children |
| `flex-direction: row \| column \| row-reverse \| column-reverse` | Defines the main axis |
| `justify-content` | Alignment along the **main** axis (`flex-start`, `center`, `space-between`, `space-around`, `flex-end`) |
| `align-items` | Alignment along the **cross** axis (`flex-start`, `center`, `stretch`, `baseline`, `flex-end`) |
| `flex-wrap: nowrap \| wrap` | Whether children wrap to new lines when they don't fit |
| `gap` | Space between children (both axes, or `row-gap`/`column-gap` individually) |

| Property (on a child) | Controls |
|---|---|
| `flex-grow` | How much a child grows to fill extra space, relative to siblings' grow values |
| `flex-shrink` | How much a child shrinks when space is tight |
| `flex-basis` | The child's initial size before growing/shrinking is applied |
| `flex: 1` shorthand | `flex-grow: 1; flex-shrink: 1; flex-basis: 0%` - "take an equal share of available space" |
| `align-self` | Overrides the container's `align-items` for just this one child |

### Common layout recipes

```css
/* Horizontal nav bar, items spaced apart, vertically centered */
.navbar { display: flex; justify-content: space-between; align-items: center; }

/* Vertically and horizontally centered content (a very common interview ask) */
.center { display: flex; justify-content: center; align-items: center; }

/* Sidebar + main content, sidebar fixed width, main fills the rest */
.layout { display: flex; }
.sidebar { flex: 0 0 240px; }   /* don't grow, don't shrink, base width 240px */
.main { flex: 1; }              /* take all remaining space */

/* Equal-width columns */
.columns { display: flex; gap: 16px; }
.column { flex: 1; }
```

### Interview question

**Q: How do you perfectly center a div both horizontally and vertically with Flexbox?**

> "`display: flex; justify-content: center; align-items: center;` on the parent centers the child along both the main axis (`justify-content`) and cross axis (`align-items`), assuming the default `flex-direction: row`."

---
