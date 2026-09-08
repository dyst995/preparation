# Enums vs Union-of-Literals — Self-test

## Core recall

1. What runtime artifact does a regular `enum` produce?
2. What is reverse mapping, and which enums have it?
3. What is a `const enum`, and what’s the main caveat?
4. Do string literal union types add runtime code?
5. How do you derive a union type from an `as const` object?
6. Why might `'ADMIN'` not assign to a string `enum` type easily, while `'admin'` assigns to a string union?
7. What’s a typical default for API role/status fields in modern TS?
8. Name one reason to still use `enum`.

## Explain why

1. Why do numeric enums make `Object.keys` surprising?
2. Why are literal unions friendlier for REST JSON?
3. Why can regular enums hurt React Native bundle size more than unions?
4. Why do some build setups break with `const enum`?
5. Why use `as const` on a roles object instead of a plain object?
6. Why are numeric enums risky for public API contracts?

## Compare and contrast

1. Numeric enum vs string enum  
2. String enum vs string literal union  
3. Regular enum vs `const enum`  
4. `as const` object map vs `enum`  
5. Erased types (unions) vs emitted enum objects  
6. Enum namespacing (`Role.Admin`) vs `ROLES.Admin` const object  

## Predict the output / checker result

1.
```ts
enum Role {
  Admin,
  Editor,
}
console.log(Role.Admin, Role[0]);
```

2.
```ts
enum Role {
  Admin = 'ADMIN',
}
console.log(Role[0]); // ?
```

3.
```ts
type Role = 'admin' | 'editor';
const r: Role = 'admin';
```

4.
```ts
enum Role {
  Admin = 'ADMIN',
}
const r: Role = 'ADMIN'; // ok or error?
```

5.
```ts
const ROLES = { Admin: 'admin' } as const;
type Role = (typeof ROLES)[keyof typeof ROLES];
const x: Role = 'admin';
```

6.
```ts
const ROLES = { Admin: 'admin' };
type Role = (typeof ROLES)[keyof typeof ROLES];
// what is Role roughly?
```

## Debugging

1. API returns `"admin"` but code checks `role === Role.Admin` where `enum Role { Admin }` (numeric). What’s wrong?

2. Loop:
```ts
enum E {
  A,
  B,
}
for (const k in E) console.log(k);
```
Why so many keys?

3. CI fails on `const enum` with `isolatedModules`. Options?

4. Team ships a large RN app; many `enum`s show up in the bundle. Migration approach?

## Application

1. Replace `enum Status { Loading, Success, Error }` with a string literal union used as a discriminant.

2. Build `as const` `HTTP_METHODS` and derive `HttpMethod` type.

3. Write a type guard `isRole(v: unknown): v is Role` for `type Role = 'admin' | 'editor'`.

4. Show a numeric enum reverse-lookup example and a safer string-union alternative for the same domain.

## Interview questions

1. Why might a team prefer string literal unions over `enum`?  
   **Follow-ups:** Bundle size? JSON interop? When keep enums?

2. Explain numeric enum reverse mapping.  
   **Follow-ups:** Why is it confusing?

3. What is `const enum` and when is it problematic?

4. How do you get enum-like namespacing without `enum`?

5. Should status discriminants be numeric enums or string literals? Why?

## Connections

1. How does this choice interact with type erasure from the structural/erased unit?
2. How do literal unions power discriminated unions?
3. How does runtime validation (`unknown`/zod) pair with string unions for API enums?
4. When would `Record<Role, string>` labels differ between enum vs union `Role`?
5. How does tree-shaking (modules unit) relate to emitted enum objects?
