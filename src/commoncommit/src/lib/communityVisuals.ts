/** Sub-linear map sizing keeps both small and large backers legible. */
export function beaconVisual(tokens: number, minTokens: number, maxTokens: number) {
  const span = Math.max(1, maxTokens - minTokens);
  const normalized = Math.sqrt(Math.max(0, Math.min(1, (tokens - minTokens) / span)));
  return {
    core: 4.5 + normalized * 5.5,
    halo: 10 + normalized * 22,
    rank: normalized,
  };
}

/** A single real pledge may produce a decorative burst, never extra donor labels. */
export function meteorBurstSize(amount: number, backerCount: number): number {
  if (amount >= 2_000 || backerCount >= 10) return 8;
  if (amount >= 750 || backerCount >= 6) return 5;
  if (amount >= 250 || backerCount >= 3) return 3;
  return 2;
}
