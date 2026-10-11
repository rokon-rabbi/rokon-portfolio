/** Distances are CSS pixels. Text remains fully opaque in every preset. */
export const MOTION = {
  desktop: { distance: 16, heroDistance: 12, duration: 0.62, stagger: 0.07 },
  compact: { distance: 6, heroDistance: 6, duration: 0.4, stagger: 0.04 },
  parallaxDistance: 14,
  ease: "power2.out",
} as const;

export function allowParallax({
  wide,
  fine,
  cores,
  memory,
  saveData,
}: {
  wide: boolean;
  fine: boolean;
  cores?: number;
  memory?: number;
  saveData?: boolean;
}) {
  return (
    wide &&
    fine &&
    !saveData &&
    (cores === undefined || cores > 4) &&
    (memory === undefined || memory > 4)
  );
}
