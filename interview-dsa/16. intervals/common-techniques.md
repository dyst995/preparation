# Intervals — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md). Jump/gas greedy is [14](../14. greedy/common-techniques.md).

**Reach for this when:** merge, insert, overlap, meeting rooms, arrows, sweep line. **Say the sort key out loud** (start vs end).

Assume `[start, end]`. Clarify inclusive/exclusive.

## Merge (sort by start)

```ts
function merge(intervals: number[][]): number[][] {
  intervals.sort((a, b) => a[0] - b[0]);
  const out = [intervals[0].slice()];
  for (let i = 1; i < intervals.length; i++) {
    const last = out[out.length - 1];
    if (intervals[i][0] <= last[1]) last[1] = Math.max(last[1], intervals[i][1]);
    else out.push(intervals[i].slice());
  }
  return out;
}
```

## Insert into a sorted disjoint list

Three phases: all fully before → merge all that overlap the new one → all fully after.

```ts
function insert(intervals: number[][], ni: number[]): number[][] {
  const out: number[][] = [];
  let i = 0, n = intervals.length;
  while (i < n && intervals[i][1] < ni[0]) out.push(intervals[i++]);
  while (i < n && intervals[i][0] <= ni[1]) {
    ni[0] = Math.min(ni[0], intervals[i][0]);
    ni[1] = Math.max(ni[1], intervals[i][1]);
    i++;
  }
  out.push(ni);
  while (i < n) out.push(intervals[i++]);
  return out;
}
```

## Non-overlapping / arrows (sort by **end**)

```ts
function eraseOverlapIntervals(intervals: number[][]): number {
  intervals.sort((a, b) => a[1] - b[1]);
  let removed = 0, end = -Infinity;
  for (const [s, e] of intervals) {
    if (s >= end) end = e;
    else removed++;
  }
  return removed;
}
```

Greedy: keep the interval that finishes first. Sorting by start is the usual wrong answer.

## Meeting rooms II (sweep)

```ts
function minMeetingRooms(intervals: number[][]): number {
  const starts = intervals.map((x) => x[0]).sort((a, b) => a - b);
  const ends = intervals.map((x) => x[1]).sort((a, b) => a - b);
  let s = 0, e = 0, rooms = 0, best = 0;
  while (s < starts.length) {
    if (starts[s] < ends[e]) { rooms++; s++; }
    else { rooms--; e++; }
    best = Math.max(best, rooms);
  }
  return best;
}
```

Heap alternative: sort by start, min-heap of end times; if next start ≥ heap min, pop (reuse room), then push this end.

## Pattern sniff

| Prompt | Sort by | Technique |
|---|---|---|
| merge overlaps | start | running merged interval |
| max keep / min remove / arrows | **end** | greedy keep |
| min rooms / max concurrent | events | sweep +1/−1 |
| insert one interval | already sorted | three-phase scan |
