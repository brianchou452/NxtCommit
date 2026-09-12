# tempo-duration

Tiny, dependency-free human duration parser and formatter.

```js
import { parseDuration, formatDuration } from "tempo-duration";

parseDuration("90m");     // 5400  (seconds)
parseDuration("2h");      // 7200
formatDuration(5400);     // "1h 30m"
```

Used by CLI tools, cron wrappers, and CI pipelines to accept human-friendly
timeouts and intervals.

## API

### `parseDuration(input) -> seconds`

Parses a duration string with a single unit: `s`, `m`, `h`, `d`, `w`.
Throws `TypeError` on non-string input; returns `NaN` for unparseable strings.

### `formatDuration(seconds) -> string`

Formats seconds into the largest sensible units, e.g. `5400` → `"1h 30m"`.

## Known limitation

Compound durations such as `"1h 30m"` are **not supported yet** and return
`NaN` — see issue #142.

## License

MIT
