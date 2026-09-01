# 17. Trie (Prefix Tree)

## Overview

A trie (pronounced "try") is a tree where each path from the root spells out
a prefix of one or more strings. Each node represents one character
position; children are keyed by the next character. Tries make prefix
operations (search, startsWith, autocomplete) extremely fast: O(L) where L
is the length of the word/prefix, independent of how many words are stored.

## When to Suspect a Trie

- The problem involves a dictionary of words and prefix queries
  ("startsWith", "autocomplete", "does any word begin with...").
- "Design a data structure that supports insert/search/startsWith."
- Word search on a grid combined with a dictionary of many words (build a
  trie of the dictionary, then DFS the grid while walking the trie).
- Longest common prefix among a set of strings.
- XOR-maximization problems (binary trie over bit representations -- see
  file 15).
- "Replace words with their shortest root" (dictionary root matching).

-------------------------------------------------------------------------------

## Core Implementation

```python
class TrieNode:
    def __init__(self):
        self.children = {}   # char -> TrieNode
        self.is_end = False  # marks end of a complete word


class Trie:  # LC 208
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word):
        node = self._find(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find(prefix) is not None

    def _find(self, s):
        node = self.root
        for ch in s:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node
```

Complexity: `insert`/`search`/`starts_with` are all O(L) time where L is the
word/prefix length, and O(ALPHABET_SIZE * total characters stored) space in
the worst case (or O(total characters) with a dict-based children map,
since only characters that actually appear allocate nodes).

-------------------------------------------------------------------------------

## Pattern 1: Wildcard Search (DFS Through the Trie)

When search patterns can include a wildcard (e.g. `.` matches any
character), DFS/backtrack through children instead of following a single
path.

```python
class WordDictionary:  # LC 211
    def __init__(self):
        self.root = TrieNode()

    def add_word(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True

    def search(self, word):
        def dfs(node, i):
            if i == len(word):
                return node.is_end
            ch = word[i]
            if ch == '.':
                return any(dfs(child, i + 1) for child in node.children.values())
            if ch not in node.children:
                return False
            return dfs(node.children[ch], i + 1)
        return dfs(self.root, 0)
```

## Pattern 2: Trie + Grid DFS (Word Search II)

Build a trie of the dictionary once. DFS the grid; at each cell, only
recurse into trie children that exist -- this prunes impossible paths early
and lets you find ALL matching words in a single grid traversal instead of
re-searching the grid once per word.

```python
def find_words(board, words):  # LC 212
    root = TrieNode()
    for w in words:
        node = root
        for ch in w:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True
        node.word = w  # stash full word at terminal node for easy collection

    rows, cols = len(board), len(board[0])
    result = []

    def dfs(r, c, node):
        ch = board[r][c]
        if ch not in node.children:
            return
        next_node = node.children[ch]
        if next_node.is_end:
            result.append(next_node.word)
            next_node.is_end = False  # avoid duplicate results
        board[r][c] = '#'
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':
                dfs(nr, nc, next_node)
        board[r][c] = ch

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)
    return result
```

## Pattern 3: Prefix Sum / Aggregation at Trie Nodes

Store extra info at each node (e.g. sum of all values for words with this
prefix) to answer aggregate prefix queries in O(L).

```python
class MapSum:  # LC 677
    def __init__(self):
        self.root = TrieNode()
        self.scores = {}

    def insert(self, key, val):
        delta = val - self.scores.get(key, 0)
        self.scores[key] = val
        node = self.root
        node.sum = getattr(node, 'sum', 0) + delta
        for ch in key:
            node = node.children.setdefault(ch, TrieNode())
            node.sum = getattr(node, 'sum', 0) + delta

    def sum(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return 0
            node = node.children[ch]
        return getattr(node, 'sum', 0)
```

## Pattern 4: Binary Trie (Bitwise Prefix Tree)

Instead of characters, children are keyed by bit 0/1 (MSB first). Used for
maximum-XOR-pair problems. See file 15 (Bit Manipulation) for the full
`find_maximum_xor` implementation using this structure.

-------------------------------------------------------------------------------

## Trie vs Hash Set/Map: When to Prefer a Trie

| Need                                                        | Prefer          |
|------------------------------------------------------------|-------------------|
| Exact membership test only                                    | Hash set (simpler, O(1) avg)|
| Prefix queries (startsWith, autocomplete)                       | Trie              |
| Many words sharing common prefixes (memory-efficient storage)   | Trie              |
| Wildcard pattern search                                         | Trie + DFS        |
| Need sorted enumeration of all words with a prefix               | Trie (DFS subtree)|
| Maximum XOR pair / bitwise prefix matching                        | Binary trie       |

-------------------------------------------------------------------------------

## Common Pitfalls

- Forgetting the `is_end` flag: a node existing on the path does not mean a
  complete word ends there (e.g. "car" is a prefix of "card" but is also a
  word itself -- both need distinguishable `is_end` markers).
- Not pruning explored words in Word Search II, causing duplicate results or
  wasted work (mark `is_end = False` after collecting, or delete empty leaf
  nodes for a cleaner solution).
- Using a fixed-size array of 26 children when the alphabet is unknown or
  includes uppercase/digits/unicode -- prefer a dict-based children map
  unless you know the alphabet is exactly lowercase a-z.
- Memory blowup: a naive trie can use more memory than a hash set for small
  datasets with little prefix sharing -- mention this trade-off if asked.
- Forgetting to reset/backtrack board state (`board[r][c] = ch`) in grid+trie
  DFS problems, corrupting subsequent searches.

## Interview Tips

- If asked to design a "Trie" class from scratch, get `insert`, `search`,
  `starts_with` working first, then handle any extra requirements
  (wildcards, counts, deletion) as follow-ups.
- For Word Search II, explicitly explain WHY the trie helps: it avoids
  re-scanning the grid once per dictionary word, turning
  O(words * grid cells * 4^L) into a single combined DFS pass.
- Mention time/space trade-offs: trie insert/search is O(L), independent of
  the number of stored words, unlike a naive prefix scan over a list of
  strings which is O(words * L).
- If the interviewer mentions "large alphabet" or "unicode," ask whether a
  dict-based trie is acceptable instead of a fixed-size array of children.

-------------------------------------------------------------------------------

## Practice

The LeetCode list for this topic is in [problems.md](./problems.md). The interview code to memorize is in [common-techniques.md](./common-techniques.md). Solve **Must** first, then Should, then Optional.
