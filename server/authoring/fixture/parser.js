// Authored bundled input for repository analysis; importing a repository never runs it.
export function parseDuration(input) {
  const match = /^(\d+)(s|m|h)$/.exec(input);
  if (!match) return NaN;
  return Number(match[1]) * { s: 1, m: 60, h: 3600 }[match[2]];
}
