# 06. HTTP caching & ETags (you used this)

> Source: `interview-prep/react-native/05-networking.md`

### Topics to learn

- [ ] `ETag` / `If-None-Match`
- [ ] `304 Not Modified`
- [ ] Cache-Control basics
- [ ] When ETags help mobile performance
- [ ] Difference between HTTP cache and React Query cache

### Why ETags matter on mobile

If content hasn�t changed, server returns 304 and the client avoids transferring the full payload. That improves:

- network usage
- battery
- perceived refetch speed
- server load

### Interview story (MyCreditInfo)

> �We improved network performance with HTTP caching and ETags alongside lazy loading. React Query handled in-memory app cache, while ETags reduced payloads on revalidation when data hadn�t changed.�

Be ready to distinguish:

- **React Query cache** = app-memory (and optional persistence) strategy
- **HTTP ETag validation** = conditional requests at transport layer

---
