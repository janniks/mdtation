# Search: instant results

## Goal

Results appear as you type, under 50 ms, without hammering the API.

## Approach

- Debounce input at 120 ms, cancel in-flight requests on every keystroke.
- Serve the first page from a local index, hydrate the rest from the server.
- Cache the last 20 queries in memory, keyed by normalized text.

## Ranking

Exact title matches first, then prefix matches, then full-text hits.
Recently opened documents get a small recency boost.
Ties break by shortest path, so top-level files win.

## Rollout

Ship behind a flag, compare click-through against the old modal for a week.
