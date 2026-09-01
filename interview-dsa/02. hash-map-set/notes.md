# 02 - Hash Map & Hash Set

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
This chapter treats `Map`/`Set`/plain objects as tools you already use daily
in application code, and focuses on how to wield them for O(n)-time
interview solutions.

## Learning Objectives

- Know when to reach for a hash map/set to collapse an O(n^2) brute force
  into O(n).
- Understand the real trade-offs between `Map`, `Set`, and plain `{}` objects
  in JS/TS, including key-type gotchas.
- Recognize the "complement lookup", "frequency counting", and "seen before"
  patterns instantly.
- Be able to reason about amortized O(1) hash operations and when hashing
  can degrade.
- Build compound keys (for pairs/tuples) correctly for map lookups.

## Core Concepts

### 1. `Map` vs `Set` vs plain object in JS/TS

| Feature | `Map` | `Set` | Plain object `{}` |
|---|---|---|---|
| Key types | any value (objects, NaN, etc.) | n/a (unique values) | strings/symbols only (numbers get stringified) |
| Preserves insertion order | yes | yes | yes for string keys, but numeric-like keys get reordered first |
| `.size` / `Object.keys().length` | O(1) `.size` | O(1) `.size` | O(n) to compute length |
| Iteration | `for...of`, `.forEach` | `for...of`, `.forEach` | `for...in`, `Object.entries` |
| Has own prototype pollution risk | no | no | yes (`__proto__`, `hasOwnProperty` collisions) |

**Interview default: prefer `Map`/`Set` over plain objects.** They avoid
prototype-key foot-guns, support any key type, and make intent explicit.

```typescript
const seen = new Set<number>();
const freq = new Map<string, number>();
```

### 2. Average O(1) operations, and when that breaks

`Map`/`Set` operations (`get`, `set`, `has`, `add`, `delete`) are amortized
**O(1) average case**, backed by a hash table. Worst case is O(n) if every
key collides into the same bucket, but this is not something you need to
defend against in interviews unless explicitly asked about adversarial
inputs or custom hash functions - assume O(1) average and say so.

### 3. The "complement lookup" pattern (Two Sum)

The canonical hash map pattern: for each element, check whether the value
you *need* has already been seen, storing as you go so it's a single pass.

```typescript
function twoSum(nums: number[], target: number): number[] {
  const seenIndexByValue = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seenIndexByValue.has(complement)) {
      return [seenIndexByValue.get(complement)!, i];
    }
    seenIndexByValue.set(nums[i], i);
  }
  return [];
}
```

This is O(n) time, O(n) space, versus the O(n^2) brute-force nested loop.
Recognize this shape whenever you see "find a pair/pair of indices that
satisfy some sum/difference condition."

### 4. Frequency counting

Count occurrences of elements/characters, then reason about the counts.
Powers anagram checks, majority-element variants, and "first unique
character" style problems.

```typescript
function charFrequency(s: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const ch of s) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  return freq;
}
```

For a bounded alphabet (e.g. lowercase English letters), a fixed-size array
of 26 counters is faster and simpler than a Map:

```typescript
function isAnagram(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const counts = new Array(26).fill(0);
  for (let i = 0; i < a.length; i++) {
    counts[a.charCodeAt(i) - 97]++;
    counts[b.charCodeAt(i) - 97]--;
  }
  return counts.every((c) => c === 0);
}
```

### 5. Grouping by a derived key

Bucket items into groups using a computed signature as the map key -
e.g. group anagrams by their sorted-character signature.

```typescript
function groupAnagrams(strs: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const s of strs) {
    const key = s.split('').sort().join('');
    const bucket = groups.get(key) ?? [];
    bucket.push(s);
    groups.set(key, bucket);
  }
  return [...groups.values()];
}
```

### 6. "Seen before" / dedup pattern

A `Set` tracks membership when you only care about "have I encountered this
before," not a count or an index.

```typescript
function containsDuplicate(nums: number[]): boolean {
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}
```

### 7. Compound / composite keys

Objects and arrays are compared by reference, not by value, so you cannot
use an array like `[x, y]` directly as a `Map`/`Set` key and expect
value-equality. Serialize to a string (or a numeric encoding) instead.

```typescript
// WRONG: every [x, y] array is a distinct reference
const seen = new Set<number[]>();
seen.add([1, 2]);
seen.has([1, 2]); // false! different array instance

// RIGHT: encode as a string key
const seenKeys = new Set<string>();
seenKeys.add(`${1},${2}`);
seenKeys.has(`${1},${2}`); // true
```

Common encodings: template string `${x},${y}`, or for two bounded small
integers, `x * OFFSET + y` as a single number key (faster than string
concatenation).

### 8. Prefix sum + hash map (subarray sum equals K)

Combining chapter 01's prefix sums with a map of "how many times have I seen
this prefix-sum value" turns an O(n^2) subarray-sum-search into O(n):

```typescript
function subarraySum(nums: number[], k: number): number {
  const prefixCount = new Map<number, number>([[0, 1]]);
  let sum = 0;
  let result = 0;
  for (const n of nums) {
    sum += n;
    result += prefixCount.get(sum - k) ?? 0;
    prefixCount.set(sum, (prefixCount.get(sum) ?? 0) + 1);
  }
  return result;
}
```

Intuition: if `sum - k` has occurred `c` times before, there are `c`
subarrays ending here that sum to exactly `k`.

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| "pair that sums/differs to target" | Complement lookup map |
| "duplicate", "seen before", "unique" | Set membership |
| "anagram", "same characters" | Frequency array/map or sorted-signature key |
| "group by ..." | Map of key -> list (bucketing) |
| "count occurrences", "most/least frequent" | Frequency map (+ optionally a heap, ch. later) |
| "subarray/substring sum equals K" | Prefix sum + frequency map |
| "first non-repeating character" | Frequency map, then a second pass for order |
| "two arrays intersection/difference" | Convert one array to a Set, scan the other |
| "consecutive sequence" (not sorted) | Set + "only start counting from sequence starts" trick |

## Time/Space Complexity Cheat Sheet

| Operation | Time (avg) | Time (worst) | Space |
|---|---|---|---|
| `Map`/`Set` get/set/has/add/delete | O(1) | O(n) | O(n) total |
| Build frequency map over n items | O(n) | O(n^2) | O(k) distinct keys |
| Complement lookup (Two Sum style) | O(n) | O(n^2) | O(n) |
| Group by derived key | O(n * L) (L = key-derivation cost, e.g. sort) | - | O(n) |
| Prefix-sum + map subarray count | O(n) | - | O(n) |
| Naive brute force pair-check (no map) | O(n^2) | O(n^2) | O(1) |

## Common Mistakes / Interview Tips

- **Reaching for plain `{}` and hitting prototype key bugs.** A key like
  `"constructor"` or `"__proto__"` can silently break plain-object lookups.
  Default to `Map`/`Set`.
- **Forgetting `??` vs `||` for counters.** `freq.get(ch) || 0` breaks if a
  legitimate count could be falsy-adjacent - not usually an issue for
  counts, but get in the habit of `?? 0` since it's always correct.
  `(freq.get(ch) ?? 0) + 1` is the safe idiom.
- **Using arrays/objects as map keys directly** without serializing them
  first - reference equality bites here.
- **Building the map, then re-scanning from index 0 for the answer** instead
  of doing complement-check-then-insert in a single pass - doubles your work
  and can produce wrong answers if you match an element with itself.
- **Off-by-one with `sum === k` vs `sum - k`** in prefix-sum problems -
  always seed the map with `{0: 1}` to account for a subarray starting at
  index 0.
- **Forgetting to say "amortized O(1)"** - interviewers listen for whether
  you understand hash maps aren't literally O(1) worst case.
- **Iterating a `Map`/`Set` and mutating it at the same time** - can cause
  skipped or repeated entries; collect keys to delete first, then delete in
  a second pass.
- **Not clarifying which "duplicate"/"pair" they mean** (adjacent-only vs
  anywhere in the array, same index allowed or not) before writing code.

## Hands-on Drills

1. Implement Two Sum with a single-pass hash map; then implement the
   two-pass version and explain in one sentence why single-pass is
   preferable.
2. Implement `isAnagram` two ways: (a) sort both strings and compare, (b)
   frequency-count with a fixed-size array. State the complexity of each.
3. Implement `groupAnagrams` using a Map keyed by sorted-string signature.
4. Implement `subarraySum` (subarray sum equals K) using prefix sum + map;
   trace through a small example by hand (e.g. `[1, 1, 1], k = 2`) before
   coding.
5. Implement "longest consecutive sequence" using a `Set`, achieving O(n)
   by only starting a count when `n - 1` is not in the set.
6. Implement "first unique character in a string" using a frequency map
   plus a second linear pass.
7. Implement an intersection of two arrays (unique values only) using a
   `Set`.
8. Build a compound-key cache: given pairs `(x, y)`, memoize a function
   result keyed by both `x` and `y` using a serialized string key.

## Practice

The LeetCode list for this topic is in [problems.md](./problems.md). The interview code to memorize is in [common-techniques.md](./common-techniques.md). Solve **Must** first, then Should, then Optional.

## Mastery Checklist

- [ ] I default to `Map`/`Set` over plain objects for interview code and can
      say why.
- [ ] I can implement the complement-lookup pattern in under 3 minutes.
- [ ] I can implement frequency counting both with a `Map` and with a
      fixed-size array for bounded alphabets.
- [ ] I can explain and implement the prefix-sum + hash map technique for
      subarray sum problems.
- [ ] I know how to build a compound/composite key for map lookups.
- [ ] I can implement Longest Consecutive Sequence in true O(n).
- [ ] I always state "amortized O(1)" instead of just "O(1)" for hash ops.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
- [ ] I can spot, within 30 seconds, whether a problem wants a Set
      (membership) vs a Map (counting/association) vs neither.
