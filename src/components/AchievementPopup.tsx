import { useEffect, useState } from 'react';
import { Achievement } from '../utils/achievements';

interface AchievementPopupProps {
    achievement: Achievement | null;
    onClose: () => void;
}

export default function AchievementPopup({ achievement, onClose }: AchievementPopupProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (achievement) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 300); // Wait for fade out
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [achievement, onClose]);

    if (!achievement) return null;

    return (
        <div className={`fixed top-20 right-4 z-40 transform transition-all duration-300 ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}>
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 rounded-xl shadow-2xl min-w-[300px] animate-bounce-slow">
                <div className="flex items-center gap-4">
                    <div className="text-5xl">{achievement.emoji}</div>
                    <div>
                        <div className="text-sm font-bold uppercase tracking-wide opacity-90">Achievement Unlocked!</div>
                        <div className="text-2xl font-bold">{achievement.name}</div>
                        <div className="text-sm opacity-90">{achievement.description}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
