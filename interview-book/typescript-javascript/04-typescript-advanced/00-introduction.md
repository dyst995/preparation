# 04 - TypeScript Advanced — Introduction

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

> Goal: Go beyond "uses TypeScript" into "understands the type-system machinery" - conditional types, mapped types, declaration merging, strict mode's individual flags, and how all of this shows up concretely in React props/hooks and NestJS DTOs/decorators. This is the chapter that separates confident senior answers from memorized syntax.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Read and write basic conditional types, including `infer`, and explain what problem they solve.
2. Read and write basic mapped types, and recognize how built-in utility types (from chapter 3) are implemented with them.
3. Explain declaration merging beyond `interface` - module augmentation, namespace merging - and where it shows up in real codebases (Express `Request` augmentation).
4. Type common React patterns precisely: component props, generic components, `useState`/`useReducer`/`useRef`, forwardRef, children.
5. Type common NestJS patterns precisely: DTOs with validation decorators, generic services/repositories, custom decorators, guards/interceptors.
6. Explain what `strict: true` actually turns on (it's a bundle of ~8 flags) and defend at least 3 of them individually.
7. Design a small, realistic DTO typing strategy end-to-end (request validation -> service layer -> response shape).

---
