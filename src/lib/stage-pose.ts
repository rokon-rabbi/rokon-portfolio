/**
 * The few numbers that pose the two braces. The motion module tweens them,
 * the scene reads them every frame, and neither needs the other to exist.
 * Entrance and scroll write to separate fields so they never fight.
 */
export interface PairPose {
  /** Brace size, 0 to 1. */
  scale: number;
  /** -1 with the pair shut together, as in the logo; 0 with each brace on its own anchor. */
  open: number;
  /** How far each brace stands outside its anchor, in half viewport widths. */
  spread: number;
  /** Extra turn about the vertical axis, in radians, mirrored per brace. */
  turn: number;
  /** 0 at rest; 1 once the pair's part of the page has scrolled away. */
  away: number;
}
export interface StagePose {
  hero: PairPose;
  closing: PairPose;
}

const rest = (): PairPose => ({ scale: 1, open: 0, spread: 0, turn: 0, away: 0 });
export const createStagePose = (): StagePose => ({ hero: rest(), closing: rest() });
export const resetStagePose = (pose: StagePose) => {
  Object.assign(pose.hero, rest());
  Object.assign(pose.closing, rest());
};
