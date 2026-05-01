/**
 * Daily-streak badge. Server component — pulls the streak value from
 * the `user_streak()` Postgres function and renders a compact tile.
 *
 * Streak counts consecutive days (ending today or yesterday) on which
 * the learner had at least one tracked activity. Defined in the
 * `learning_activity` migration; updated by triggers on lesson_progress.
 */

type StreakBadgeProps = {
  streak: number;
  /** Compact = single-line for the dashboard masthead. */
  variant?: "compact" | "tile";
};

export function StreakBadge({ streak, variant = "tile" }: StreakBadgeProps) {
  const isHot = streak >= 3;
  const label = streak === 1 ? "day" : "days";

  if (variant === "compact") {
    return (
      <span className="kicker inline-flex items-center gap-2">
        {isHot ? (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
        ) : null}
        Streak · {streak} {label}
      </span>
    );
  }

  return (
    <div className="bg-card p-6">
      <div className="kicker">Daily streak</div>
      <div className="data-numeral mt-2 flex items-baseline gap-2 text-[2.6rem] leading-none text-ink">
        {streak}
        <span className="text-base font-normal text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {streak === 0
          ? "Watch a video, pass a quiz, or submit an artifact to start one."
          : isHot
            ? "Hot streak — keep it going."
            : "Build it back to 3+ for a hot streak."}
      </div>
    </div>
  );
}
