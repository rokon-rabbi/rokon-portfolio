/**
 * The few numbers that pose the stage scene. The motion module tweens them,
 * the scene reads them every frame, and neither needs the other to exist.
 * Entrance and scroll write to separate fields so they never fight.
 */
export interface StagePose {
  hero: {
    /** Brace size, 0 to 1. */
    scale: number;
    /** How far the braces stand apart from rest, in figure widths. */
    open: number;
    /** Extra turn about the vertical axis, in radians, mirrored per brace. */
    turn: number;
    /** 0 at the top of the page, 1 once the cover has scrolled away. */
    away: number;
    /** Opacity of the figure. */
    figure: number;
  };
  closing: {
    scale: number;
    /** How far the braces stand apart from rest, in viewport widths. */
    open: number;
    turn: number;
  };
}

export const createStagePose = (): StagePose => ({
  hero: { scale: 1, open: 0, turn: 0, away: 0, figure: 1 },
  closing: { scale: 1, open: 0, turn: 0 },
});
