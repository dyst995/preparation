# Stack and Queue — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** matching pairs, nested decode, next greater, histogram, sliding-window max, RPN/calculator.

## Stack in JS

```ts
const stack: number[] = [];
stack.push(x);
const top = stack[stack.length - 1];
stack.pop(); // never shift/unshift — those are O(n) and the wrong end
```

## Queue via two stacks (amortized O(1))

```ts
class QueueViaStacks<T> {
  private inn: T[] = [];
  private out: T[] = [];
  enqueue(v: T): void { this.inn.push(v); }
  dequeue(): T | undefined {
    if (!this.out.length) {
      while (this.inn.length) this.out.push(this.inn.pop()!);
    }
    return this.out.pop();
  }
}
```

## Matching / nesting

```ts
function isValid(s: string): boolean {
  const pair: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const st: string[] = [];
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') st.push(ch);
    else if (st.pop() !== pair[ch]) return false;
  }
  return st.length === 0;
}
```

Same shape: decode string, asteroid collision, adjacent duplicates.

## Monotonic stack (next greater / daily temperatures)

```ts
function dailyTemperatures(t: number[]): number[] {
  const ans = new Array(t.length).fill(0);
  const st: number[] = []; // indices, decreasing values
  for (let i = 0; i < t.length; i++) {
    while (st.length && t[i] > t[st[st.length - 1]]) {
      const j = st.pop()!;
      ans[j] = i - j;
    }
    st.push(i);
  }
  return ans;
}
```

Each index is pushed/popped at most once → O(n).

## Monotonic deque (sliding window maximum)

Keep indices with **decreasing** values. Front is the window max. Drop front if it left the window; pop back while it is ≤ the new value.

## RPN / calculator

```ts
function evalRPN(tokens: string[]): number {
  const st: number[] = [];
  for (const tok of tokens) {
    if (tok === '+' || tok === '-' || tok === '*' || tok === '/') {
      const b = st.pop()!, a = st.pop()!;
      st.push(tok === '+' ? a + b : tok === '-' ? a - b : tok === '*' ? a * b : Math.trunc(a / b));
    } else st.push(Number(tok));
  }
  return st[0];
}
```

## Pattern sniff

| Prompt | Technique |
|---|---|
| parentheses / nested | stack match |
| next greater / stock span | monotonic stack |
| window max | monotonic deque |
| RPN / calculator | operand stack |
| BFS | queue |
| iterative DFS | stack |
