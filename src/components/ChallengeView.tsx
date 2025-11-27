import { useState } from 'react';

interface Challenge {
  id: number;
  name: string;
  desc: string;
  reward: number;
  check: (stats: any) => boolean;
  hints?: string[];
}

interface Stats {
  blocks: number;
  height: number;
  matCount: number;
  glows: number;
}

interface TestResult {
  passed: boolean;
  stars: number;
  feedback: string[];
}

interface ChallengeViewProps {
  challenge: Challenge;
  stats: Stats;
  onTest: () => void;
  onClose: () => void;
  disableTest?: boolean;
  result?: TestResult;
}

export default function ChallengeView({
  challenge,
  stats,
  onTest,
  onClose,
  disableTest = false,
  result
}: ChallengeViewProps) {
  const [showHints, setShowHints] = useState(false);

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full text-white border border-purple-600/30 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-purple-400">{challenge.name}</h2>
            <p className="text-sm text-gray-400 mt-1">{challenge.desc}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Requirements */}
        <div className="bg-gray-900/50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-bold text-yellow-400 mb-2">Requirements</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Blocks placed:</span>
              <span className="text-green-400">{stats.blocks}</span>
            </div>
            {stats.height > 0 && (
              <div className="flex justify-between">
                <span>Height:</span>
                <span className="text-green-400">{stats.height}</span>
              </div>
            )}
            {stats.matCount > 0 && (
              <div className="flex justify-between">
                <span>Materials used:</span>
                <span className="text-green-400">{stats.matCount}</span>
              </div>
            )}
            {stats.glows > 0 && (
              <div className="flex justify-between">
                <span>Glowing blocks:</span>
                <span className="text-green-400">{stats.glows}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reward */}
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 p-3 rounded-lg mb-4 border border-yellow-600/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Reward:</span>
            <span className="text-yellow-400 font-bold text-lg">+{challenge.reward} 💰</span>
          </div>
        </div>

        {/* Hints Section */}
        {challenge.hints && challenge.hints.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowHints(!showHints)}
              className="w-full bg-gray-700/50 hover:bg-gray-700 p-3 rounded-lg text-left flex justify-between items-center transition-all"
            >
              <span className="text-sm font-bold text-cyan-400">💡 Hints</span>
              <span className="text-gray-400">{showHints ? '▼' : '▶'}</span>
            </button>
            {showHints && (
              <div className="mt-2 bg-gray-900/50 p-3 rounded-lg space-y-2">
                {challenge.hints.map((hint, index) => (
                  <div key={index} className="text-sm text-gray-300 flex items-start">
                    <span className="text-cyan-400 mr-2">{index + 1}.</span>
                    <span>{hint}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Result Message */}
        {result && (
          <div className={`mb-4 p-4 rounded-lg border-2 ${
            result.passed
              ? 'bg-green-900/30 border-green-600'
              : 'bg-red-900/30 border-red-600'
          }`}>
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">{result.passed ? '✓' : '✗'}</span>
              <span className="font-bold">
                {result.passed ? 'Challenge Complete!' : 'Not Yet Complete'}
              </span>
            </div>
            {result.passed && (
              <div className="text-yellow-400 mb-2">
                {'⭐'.repeat(result.stars)} ({result.stars} star{result.stars !== 1 ? 's' : ''})
              </div>
            )}
            <div className="space-y-1">
              {result.feedback.map((message, index) => (
                <p key={index} className="text-sm text-gray-300">{message}</p>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onTest}
            disabled={disableTest}
            className={`flex-1 py-3 rounded-lg font-bold transition-all transform hover:scale-105 ${
              disableTest
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl'
            }`}
            aria-label="Test your build"
          >
            🧪 Test Build
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 text-white transition-all"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {/* Progress Hint */}
        {!result && (
          <p className="text-xs text-center text-gray-500 mt-3">
            Build your structure and test it to complete the challenge!
          </p>
        )}
      </div>
    </div>
  );
}
