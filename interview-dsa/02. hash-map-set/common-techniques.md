# Hash Map and Hash Set — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** pair that sums, seen before, frequency, group by signature, subarray sum = k. Default to `Map`/`Set`, not `{}`.

## Complement lookup (Two Sum)

```ts
function twoSum(nums: number[], target: number): number[] {
  const idx = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (idx.has(need)) return [idx.get(need)!, i];
    idx.set(nums[i], i); // insert AFTER the check so you never pair with self
  }
  return [];
}
```

## Frequency

```ts
function freq(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1);
  return m;
}

function isAnagram(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const c = new Array(26).fill(0);
  for (let i = 0; i < a.length; i++) {
    c[a.charCodeAt(i) - 97]++;
    c[b.charCodeAt(i) - 97]--;
  }
  return c.every((n) => n === 0);
}
```

## Seen / duplicates

```ts
function containsDuplicate(nums: number[]): boolean {
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}
```

## Group by derived key (anagrams)

```ts
function groupAnagrams(strs: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const s of strs) {
    const key = [...s].sort().join('');
    const bucket = groups.get(key) ?? [];
    bucket.push(s);
    groups.set(key, bucket);
  }
  return [...groups.values()];
}
```

## Compound keys (grids, pairs)

```ts
// arrays/objects are by reference — serialize
seen.add(`${r},${c}`);
```

## Prefix + map (subarray sum equals k)

```ts
function subarraySum(nums: number[], k: number): number {
  const count = new Map<number, number>([[0, 1]]);
  let sum = 0, ans = 0;
  for (const n of nums) {
    sum += n;
    ans += count.get(sum - k) ?? 0;
    count.set(sum, (count.get(sum) ?? 0) + 1);
  }
  return ans;
}
```

If prefix `sum - k` appeared `c` times, there are `c` subarrays ending here that total `k`.

## Longest consecutive (set + only start a run at the left edge)

```ts
function longestConsecutive(nums: number[]): number {
  const s = new Set(nums);
  let best = 0;
  for (const n of s) {
    if (s.has(n - 1)) continue; // not a start
    let len = 1;
    while (s.has(n + len)) len++;
    best = Math.max(best, len);
  }
  return best;
}
```

## Pattern sniff

| Prompt | Technique |
|---|---|
| pair sums to target | complement map |
| duplicate / unique | Set |
| anagram / same letters | freq array or sorted key |
| group by X | Map → list |
| subarray sums to k | prefix + map |
