import { useState, useEffect } from 'react';

interface TutorialOverlayProps {
    step: number;
    onNext: () => void;
    onSkip: () => void;
}

const TUTORIAL_STEPS = [
    {
        title: "🎮 Welcome to Kingdom Builder!",
        description: "Let's learn how to build your amazing kingdom!",
        instructions: "Use WASD or Arrow keys to move the camera around. Try it now!",
        highlight: null
    },
    {
        title: "🏗️ Place Your First Block",
        description: "Move your mouse to see a preview block appear.",
        instructions: "Click anywhere on the ground to place your first block!",
        highlight: "preview"
    },
    {
        title: "🎨 Choose Materials",
        description: "Different materials make your kingdom colorful!",
        instructions: "Click on the colorful squares at the bottom to try different materials.",
        highlight: "materials"
    },
    {
        title: "📦 Try Block Types",
        description: "You can build with different shaped blocks!",
        instructions: "Click the block type buttons to change shapes (cube, cylinder, pillar).",
        highlight: "types"
    },
    {
        title: "👑 Ask the King",
        description: "The King will tell you how awesome your build is!",
        instructions: "Click the 'Ask King' button to get feedback on your creation!",
        highlight: "king"
    }
];

export default function TutorialOverlay({ step, onNext, onSkip }: TutorialOverlayProps) {
    const [fadeIn, setFadeIn] = useState(false);

    useEffect(() => {
        setFadeIn(false);
        const timer = setTimeout(() => setFadeIn(true), 50);
        return () => clearTimeout(timer);
    }, [step]);

    if (step < 1 || step > TUTORIAL_STEPS.length) return null;

    const currentStep = TUTORIAL_STEPS[step - 1];
    const isLastStep = step === TUTORIAL_STEPS.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/70 pointer-events-auto" />

            {/* Tutorial card */}
            <div
                className={`relative bg-gradient-to-br from-purple-600 to-pink-600 text-white p-8 rounded-2xl shadow-2xl max-w-md mx-4 pointer-events-auto transform transition-all duration-300 ${fadeIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
            >
                {/* Progress indicator */}
                <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                    Step {step}/{TUTORIAL_STEPS.length}
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold">{currentStep.title}</h2>
                    <p className="text-xl">{currentStep.description}</p>
                    <div className="bg-white/20 p-4 rounded-lg">
                        <p className="text-lg font-semibold">📝 {currentStep.instructions}</p>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onSkip}
                        className="flex-1 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-bold transition-all"
                    >
                        Skip Tutorial
                    </button>
                    <button
                        onClick={onNext}
                        className="flex-1 px-6 py-3 bg-white hover:bg-gray-100 text-purple-600 rounded-lg font-bold transition-all transform hover:scale-105"
                    >
                        {isLastStep ? "Let's Build! 🎉" : "Next →"}
                    </button>
                </div>

                {/* Bounce animation for emphasis */}
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="animate-bounce-slow text-4xl">👇</div>
                </div>
            </div>
        </div>
    );
}
