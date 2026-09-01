# Trie — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** insert/search/startsWith, autocomplete, replace with shortest root, word search II (many words on a grid), max XOR pair (binary trie).

Each edge is one character. Query is O(L), not O(dictionary size).

## Core

```ts
class TrieNode {
  children = new Map<string, TrieNode>();
  isEnd = false;
}

class Trie {
  root = new TrieNode();

  insert(word: string): void {
    let n = this.root;
    for (const ch of word) {
      if (!n.children.has(ch)) n.children.set(ch, new TrieNode());
      n = n.children.get(ch)!;
    }
    n.isEnd = true;
  }

  private find(s: string): TrieNode | null {
    let n: TrieNode | null = this.root;
    for (const ch of s) {
      if (!n.children.has(ch)) return null;
      n = n.children.get(ch)!;
    }
    return n;
  }

  search(word: string): boolean {
    const n = this.find(word);
    return !!n?.isEnd;
  }

  startsWith(prefix: string): boolean {
    return this.find(prefix) !== null;
  }
}
```

## Wildcard `.` (DFS in the trie)

At `.`, try every child. At a letter, follow that child only. Success only if you land on `isEnd`.

## Word Search II

Insert all words into a trie. DFS the grid while walking the trie. Mark the cell visited, recurse 4-dir, unmark. When `node.isEnd`, record the word and optionally clear `isEnd` so you don’t record twice. Prune a trie edge after a branch is exhausted if you want extra speed.

## Prefix aggregation

Store `sum` / `count` on the node; update on insert so prefix queries are O(L).

## Binary trie (max XOR)

Insert 32-bit numbers MSB first. To maximize XOR with `x`, at each bit prefer the child that is `1 - bit(x)`.
