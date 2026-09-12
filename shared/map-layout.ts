import type { Beacon } from "./home.js";
/** Place labels in canonical 1000×500 coordinates, avoiding other label boxes. */
export function mapLabels(beacons: readonly Beacon[]) {
  const occupied: { x: number; y: number; width: number; height: number }[] =
    [];
  return beacons.flatMap((beacon) => {
    const originX = ((beacon.lng + 180) * 1000) / 360,
      originY = ((90 - beacon.lat) * 500) / 180;
    const width = beacon.city.length * 5.8 + 8,
      height = 15;
    for (const dy of [-14, 18, -32, 36, -50, 54, -68, 72])
      for (const dx of [8, -width - 8, 28, -width - 28]) {
        const x = Math.max(3, Math.min(997 - width, originX + dx)),
          y = Math.max(15, Math.min(485, originY + dy));
        const box = { x, y: y - 12, width, height };
        if (
          occupied.some(
            (b) =>
              box.x < b.x + b.width &&
              box.x + box.width > b.x &&
              box.y < b.y + b.height &&
              box.y + box.height > b.y,
          )
        )
          continue;
        occupied.push(box);
        return [{ id: beacon.contributorId, city: beacon.city, x, y }];
      }
    return [];
  });
}
