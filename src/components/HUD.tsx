interface HUDProps {
  score: number;
  gold: number;
  blockCount: number;
  title: string;
  titleColor: string;
  nextLevelScore?: number;
  level?: number;
  xp?: number;
  nextLevelXP?: number;
}

export default function HUD({
  score,
  gold,
  blockCount,
  title,
  titleColor,
  nextLevelScore,
  level,
  xp,
  nextLevelXP,
}: HUDProps) {
  // Calculate progress percentage for next level
  const progressToNextLevel = nextLevelScore
    ? Math.min((score / nextLevelScore) * 100, 100)
    : 100;

  const xpProgress = nextLevelXP && xp !== undefined
    ? Math.min((xp / nextLevelXP) * 100, 100)
    : 100;

  return (
    <div className="fixed top-4 left-4 z-30 bg-black bg-opacity-70 text-white p-4 rounded-lg shadow-xl min-w-[280px]">
      {/* Player Title */}
      <div className="mb-3">
        <h2 className={`text-2xl font-bold ${titleColor}`}>{title}</h2>
      </div>

      {/* Stats Grid */}
      <div className="space-y-2">
        {/* Score */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">Score:</span>
          <span className="font-bold text-lg">
            {score}
            {nextLevelScore && ` / ${nextLevelScore}`}
          </span>
        </div>

        {/* Progress bar for next level (score-based) */}
        {nextLevelScore && (
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressToNextLevel}%` }}
            />
          </div>
        )}

        {/* Gold */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">Gold:</span>
          <span className="font-bold text-lg text-yellow-400">
            {gold}
          </span>
        </div>

        {/* Blocks Placed */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">Blocks:</span>
          <span className="font-bold text-lg">
            {blockCount}
          </span>
        </div>

        {/* Level and XP (if provided) */}
        {level !== undefined && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 text-sm">Level {level}</span>
              {xp !== undefined && nextLevelXP && (
                <span className="text-sm text-gray-400">
                  {xp} / {nextLevelXP} XP
                </span>
              )}
            </div>
            {xp !== undefined && nextLevelXP && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
