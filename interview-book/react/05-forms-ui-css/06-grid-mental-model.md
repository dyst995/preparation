# 06. Grid mental model

> Source: `interview-prep/react/05-forms-ui-css.md`

### When Grid beats Flexbox

Flexbox is fundamentally **one-dimensional** (a single row or column, even if it wraps). Grid is **two-dimensional** - you define rows and columns simultaneously and place items into cells, making it the better tool for actual page/dashboard layouts, not just single rows/columns of items.

| Property (on container) | Controls |
|---|---|
| `display: grid` | Turns on grid layout |
| `grid-template-columns` / `grid-template-rows` | Defines the column/row tracks, e.g. `repeat(3, 1fr)` for 3 equal columns |
| `gap` | Space between grid cells |
| `grid-template-areas` | Named layout regions for readable, declarative page layout |

```css
/* Classic dashboard layout: header, sidebar, main content, footer */
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
.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }
```

```css
/* Responsive card grid without media queries - auto-fills as many columns as fit at >=200px each */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

### Interview question

**Q: When would you reach for Grid instead of Flexbox?**

> "When the layout is genuinely two-dimensional - I need to control rows and columns together, like a page shell with a header, sidebar, main content, and footer, or a card grid that wraps responsively. Flexbox is one-dimensional; it's great for a single row or column of items (a toolbar, a list, centering a single element), but coordinating both axes at once with named regions is where Grid is the clearly better, more declarative tool - `grid-template-areas` reads almost like an ASCII diagram of the layout."

---
