export const DEMO_TOUR_EVENT = "commoncommit:demo-tour";

export type DemoTourRole = "maintainer" | "provider";

/** Reads the explicit point of view carried across the guided journey. */
export function demoTourRole(search: string): DemoTourRole | null {
  const value = new URLSearchParams(search).get("demo");
  return value === "maintainer" || value === "provider" ? value : null;
}

export interface DemoTourUpdate {
  role: DemoTourRole;
  step: number;
  total: number;
  title: string;
  detail: string;
  state?: "running" | "waiting" | "done" | "error";
  /** Visible control or evidence panel the onboarding card should point at. */
  anchorSelector?: string;
}

let latestUpdate: DemoTourUpdate | null = null;

/** Publishes only UI state; all real work still goes through each page's controls. */
export function publishDemoTour(update: DemoTourUpdate): void {
  latestUpdate = update;
  window.dispatchEvent(new CustomEvent<DemoTourUpdate>(DEMO_TOUR_EVENT, { detail: update }));
}

export function latestDemoTourUpdate(): DemoTourUpdate | null {
  return latestUpdate;
}

/** Highlights the real control, but deliberately leaves the click to the user. */
export function highlightDemoControl(selector: string): boolean {
  document.querySelectorAll<HTMLElement>("[data-demo-active='true']").forEach((node) => {
    delete node.dataset.demoActive;
  });
  const element = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(node => node.getClientRects().length > 0);
  if (!element) return false;
  element.dataset.demoActive = "true";
  element.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  return true;
}

export function clearDemoControl(): void {
  document.querySelectorAll<HTMLElement>("[data-demo-active='true']").forEach((node) => {
    delete node.dataset.demoActive;
  });
}
