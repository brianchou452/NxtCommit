export type MissionSource = "fixture" | "github";

/** True only while an analysis result still belongs to the visible source. */
export function isCurrentAnalyzeRequest(
  requestToken: number,
  requestSource: MissionSource,
  activeToken: number,
  activeSource: MissionSource
): boolean {
  return requestToken === activeToken && requestSource === activeSource;
}
