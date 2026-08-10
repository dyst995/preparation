# 01. REST API design

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

### Topics to learn
- [ ] Resource-oriented URLs (nouns, not verbs)
- [ ] HTTP verb semantics: GET/POST/PUT/PATCH/DELETE
- [ ] Status code discipline (2xx/4xx/5xx meaning)
- [ ] Pagination, filtering, sorting conventions
- [ ] Idempotency (which verbs must be idempotent, and why POST usually isn't)
- [ ] Versioning strategies (URI `/v1/`, header, media type)
- [ ] Nested resources vs flat resources with query filters

### Resource naming

| Good | Bad | Why |
|---|---|---|
| `GET /appointments/:id` | `GET /getAppointment?id=1` | Resource is a noun, not an RPC-style verb |
| `POST /appointments` | `POST /appointments/create` | The verb is already `POST` |
| `GET /vets/:id/appointments` | `GET /getVetAppointments/:id` | Nesting expresses the relationship |
| `PATCH /appointments/:id` | `POST /appointments/:id/update` | Partial update maps to PATCH |

### HTTP verbs

| Verb | Semantics | Idempotent? | Typical status |
|---|---|---|---|
| GET | Read, no side effects | Yes | 200 |
| POST | Create, or trigger a non-idempotent action | No | 201 (created) / 200 |
| PUT | Full replace of a resource | Yes | 200 / 204 |
| PATCH | Partial update | Not guaranteed, usually treated as yes | 200 |
| DELETE | Remove a resource | Yes (deleting twice = still gone) | 204 / 200 |

### Status codes worth knowing cold

| Code | Meaning | Example |
|---|---|---|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | Successful POST creating a resource |
| 204 | No Content | Successful DELETE, no body |
| 400 | Bad Request | Failed validation |
| 401 | Unauthorized | Missing/invalid credentials (not authenticated) |
| 403 | Forbidden | Authenticated but not allowed (RBAC failure) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, optimistic lock conflict |
| 422 | Unprocessable Entity | Semantically invalid though syntactically valid (some teams use this instead of 400 for validation) |
| 429 | Too Many Requests | Rate limiting |
| 500 | Internal Server Error | Unhandled exception |

### Pagination/filtering/sorting

```
GET /appointments?page=2&limit=20&status=confirmed&sort=-createdAt
```

- Offset pagination (`page`/`limit`) is simple but has consistency issues under heavy writes.
- Cursor pagination (`?cursor=<opaque_id>`) is more scalable for large, frequently-changing datasets - worth mentioning as the "senior" alternative even if you mostly used offset pagination in practice.
- Always return pagination metadata: `{ data: [...], meta: { total, page, limit, totalPages } }`.

### Versioning

Nest supports built-in versioning:

```typescript
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

@Controller({ path: 'appointments', version: '1' })
```

URI versioning (`/v1/appointments`) is the most common and cache/proxy-friendly; header versioning is more "RESTfully pure" but harder to explore/debug manually.

### Interview questions

**Q: How do you decide between PUT and PATCH?**
> "PUT replaces the whole resource - the client sends the full representation. PATCH is a partial update - only the fields being changed. In practice I use PATCH for almost all updates because clients rarely have (or want to resend) the full resource state, and it's more forgiving for concurrent partial edits."

**Q: 401 vs 403 - what's the difference and do you always get this right?**
> "401 means the request isn't authenticated at all - no token, or an invalid/expired one. 403 means the caller *is* authenticated but the RBAC/ownership check says they're not allowed to do this specific thing. On VetApp, a receptionist hitting an admin-only endpoint gets 403, not 401 - the JWT is perfectly valid, they're just not authorized for that action."

---
