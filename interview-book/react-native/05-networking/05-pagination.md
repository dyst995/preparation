# 05. Pagination

> Source: `interview-prep/react-native/05-networking.md`

### Offset/limit

```text
GET /transactions?offset=40&limit=20
```

**Pros:** simple  
**Cons:** can skip/duplicate items if new rows are inserted while scrolling

### Cursor/keyset

```text
GET /transactions?cursor=eyJpZCI6MTIzfQ&limit=20
```

**Pros:** stable for infinite scroll, better for changing datasets  
**Cons:** slightly more backend complexity; hard to jump to arbitrary page numbers

### Mobile preference

For feeds/transactions: **cursor + infinite query** is usually best.

### Interview question

**Q: How do you paginate a transactions list?**

> �I prefer cursor-based pagination with React Query infinite queries. It behaves better as new transactions arrive. Each page key includes account id and cursors. I keep row rendering light and cache pages carefully.�

---
