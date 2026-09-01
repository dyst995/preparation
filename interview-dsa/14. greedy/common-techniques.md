# Greedy — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md). Interval merge/sweep lives in [16](../16. intervals/common-techniques.md). Say the greedy choice in one sentence **before** coding.

**Reach for this when:** jump game, gas station, “always extend farthest”, sort then one pass, Huffman-style “pick current best” (often a heap).

## Jump game — running reach

```ts
function canJump(nums: number[]): boolean {
  let reach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;
    reach = Math.max(reach, i + nums[i]);
  }
  return true;
}

function jump(nums: number[]): number {
  let jumps = 0, end = 0, far = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    far = Math.max(far, i + nums[i]);
    if (i === end) {
      jumps++;
      end = far;
    }
  }
  return jumps;
}
```

## Gas station

```ts
function canCompleteCircuit(gas: number[], cost: number[]): number {
  let total = 0, tank = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    const d = gas[i] - cost[i];
    total += d;
    tank += d;
    if (tank < 0) {
      start = i + 1;
      tank = 0;
    }
  }
  return total >= 0 ? start : -1;
}
```

If total gas ≥ total cost, a unique start exists; reset start whenever tank goes negative.

## Stock II (unlimited)

```ts
function maxProfit(prices: number[]): number {
  let p = 0;
  for (let i = 1; i < prices.length; i++)
    if (prices[i] > prices[i - 1]) p += prices[i] - prices[i - 1];
  return p;
}
```

## Partition labels

Track last index of each char. Grow a window to that last index; close the partition when `i === end`.

## Sort then sweep

Only when the sort key is the greedy key (often **end** time for interval selection). Proof sketch: exchange argument — swapping a worse pick for the greedy pick never hurts.

## Heap greedy

When “best next” is dynamic (task scheduler idle slots, reorganize string): count frequencies, always pop the current max remaining. Implementation uses [09](../09. heap-priority-queue/common-techniques.md).
