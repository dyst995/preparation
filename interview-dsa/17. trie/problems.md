# Trie — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

| Problem                                              | LeetCode # | Difficulty | Priority | Notes                              |
|----------------------------------------------------------|------------|------------|----------|----------------------------------------|
| Implement Trie (Prefix Tree)                                | 208        | Medium     | Must     | foundational insert/search/startsWith   |
| Design Add and Search Words Data Structure                   | 211        | Medium     | Must     | wildcard `.` via DFS through children   |
| Word Search II                                              | 212        | Hard       | Must     | trie + grid DFS combo, very common       |
| Replace Words                                                | 648        | Medium     | Should   | shortest root prefix lookup             |
| Longest Word in Dictionary                                    | 720        | Medium     | Should   | DFS/BFS trie, all prefixes must be words|
| Map Sum Pairs                                                 | 677        | Medium     | Should   | trie nodes store aggregate sum          |
| Implement Magic Dictionary                                     | 676        | Medium     | Should   | trie + 1-char-mismatch DFS              |
| Search Suggestions System                                       | 1268       | Medium     | Should   | trie + DFS to collect top-3 per prefix   |
| Maximum XOR of Two Numbers in an Array                          | 421        | Medium     | Should   | binary trie, see [15. bit-manipulation](../15. bit-manipulation/notes.md) for full code   |
| Palindrome Pairs                                                | 336        | Hard       | Optional | trie of reversed words + palindrome check|
| Concatenated Words                                               | 472        | Hard       | Optional | trie/DP hybrid, word-break per word       |
| Stream of Characters                                              | 1032       | Hard       | Optional | trie built on reversed dictionary words   |
| Short Encoding of Words                                           | 820        | Medium     | Optional | trie of reversed words, count leaves      |
| Prefix and Suffix Search                                            | 745        | Hard       | Optional | combined-key trie trick                   |
