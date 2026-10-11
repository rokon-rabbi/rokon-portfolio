/** Decorative scene budgets; independent of content and GSAP ownership. */
export const HERO_SCENE = {
  full: { fps: 30, dpr: 1.5, nodes: 5, packets: 3, layers: 3 },
  compact: { fps: 20, dpr: 1, nodes: 3, packets: 1, layers: 2 },
  pointerAngle: 0.055,
  maxPixels: 650_000,
  warmupFrames: 30,
  sampleFrames: 30,
} as const;
export type SceneTier = "full" | "compact";
export type ScenePolicy = { tier: SceneTier | "static"; reason: string };

export function scenePolicy({
  enabled = true,
  reduced,
  compact,
  fine,
  cores,
  memory,
  saveData,
  connection,
}: {
  enabled?: boolean;
  reduced: boolean;
  compact: boolean;
  fine: boolean;
  cores?: number;
  memory?: number;
  saveData?: boolean;
  connection?: string;
}): ScenePolicy {
  if (!enabled) return { tier: "static", reason: "disabled" };
  if (reduced) return { tier: "static", reason: "reduced-motion" };
  if (saveData || connection === "2g" || connection === "slow-2g")
    return { tier: "static", reason: "data-saving" };
  if (
    (cores !== undefined && cores <= 2) ||
    (memory !== undefined && memory <= 2)
  )
    return { tier: "static", reason: "device-budget" };
  return {
    tier:
      compact ||
      !fine ||
      (cores !== undefined && cores <= 4) ||
      (memory !== undefined && memory <= 4)
        ? "compact"
        : "full",
    reason: "eligible",
  };
}

export function scenePixelRatio(
  width: number,
  height: number,
  deviceDpr: number,
  tier: SceneTier,
) {
  return Math.min(
    Math.max(0.5, deviceDpr || 1),
    HERO_SCENE[tier].dpr,
    Math.sqrt(HERO_SCENE.maxPixels / Math.max(1, width * height)),
  );
}

/** Sustained slow work degrades once, then returns to SVG. Startup is excluded. */
export function sceneBudgetAction(
  tier: SceneTier,
  samples: readonly { cost: number; interval: number }[],
) {
  if (samples.length < HERO_SCENE.sampleFrames) return "keep";
  const average =
    samples.reduce((sum, frame) => sum + frame.cost, 0) / samples.length;
  const slow = samples.filter(
    (frame) => frame.interval > (tier === "full" ? 75 : 110),
  ).length;
  if (average > (tier === "full" ? 10 : 18) || slow > samples.length * 0.6)
    return tier === "full" ? "compact" : "static";
  return "keep";
}
