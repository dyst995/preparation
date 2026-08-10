# 13. Cancelation & screen lifecycle

> Source: `interview-prep/react-native/05-networking.md`

### Topics to learn

- [ ] AbortController with fetch/axios
- [ ] React Query�s automatic cancelation behaviors
- [ ] Avoid setState after unmount (less common with modern RQ, still conceptual)
- [ ] Dropping stale responses when a newer query key is active

### Interview question

**Q: How do you cancel requests when a screen unmounts?**

> �I rely on React Query/AbortController integration for query cancelation, and I make sure mutations don�t leave dangling UI updates. For manual requests, I pass an abort signal tied to the component lifecycle.�

---
