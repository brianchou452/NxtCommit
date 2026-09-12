# Issue #142 — parseDuration returns NaN for compound durations like "1h 30m"

**Labels:** enhancement, help wanted, good first issue
**Opened by:** @cron-runner-ci · 47 👍 · 12 linked issues in dependent projects

## Description

`formatDuration(5400)` produces `"1h 30m"`, but feeding that exact string back
into `parseDuration` returns `NaN`. The library cannot round-trip its own
output.

```js
formatDuration(5400);            // "1h 30m"
parseDuration("1h 30m");         // NaN  ← expected 5400
parseDuration("1h30m");          // NaN  ← expected 5400 (no-space form)
parseDuration("1d 2h 30m 10s");  // NaN  ← expected 95410
```

This breaks every dependent tool that stores a formatted duration and parses
it back (cron wrappers, CI timeout configs, retry backoff settings).

## Expected behaviour

- `parseDuration("1h 30m")` → `5400`
- Whitespace between segments optional: `"1h30m"` → `5400`
- Repeated units accumulate: `"30m 30m"` → `3600`
- Existing single-unit behaviour unchanged
- Invalid trailing garbage still returns `NaN` (`"1h banana"`)

## Notes from maintainer (@mira-holt)

Happy to take this. Needs tests covering the no-space form and mixed-order
segments — that's where naive splitting approaches usually break.
