export interface Achievement {
    id: string;
    name: string;
    description: string;
    emoji: string;
    check: (stats: GameStats) => boolean;
}

export interface GameStats {
    blocks: number;
    maxHeight: number;
    materialsUsed: number;
    glowingBlocks: number;
    score: number;
    goldEarned: number;
    tiersUnlocked: number;
}

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first_builder',
        name: 'First Builder',
        description: 'Place your first block!',
        emoji: '🏰',
        check: (stats) => stats.blocks >= 1
    },
    {
        id: 'tower_master',
        name: 'Tower Master',
        description: 'Build 10 blocks tall!',
        emoji: '🗼',
        check: (stats) => stats.maxHeight >= 10
    },
    {
        id: 'rainbow_builder',
        name: 'Rainbow Builder',
        description: 'Use 5 different materials!',
        emoji: '🌈',
        check: (stats) => stats.materialsUsed >= 5
    },
    {
        id: 'glow_expert',
        name: 'Glow Expert',
        description: 'Place 10 glowing blocks!',
        emoji: '✨',
        check: (stats) => stats.glowingBlocks >= 10
    },
    {
        id: 'royal_architect',
        name: 'Royal Architect',
        description: 'Reach 2000 points!',
        emoji: '👑',
        check: (stats) => stats.score >= 2000
    },
    {
        id: 'material_collector',
        name: 'Material Collector',
        description: 'Unlock all materials!',
        emoji: '🎨',
        check: (stats) => stats.tiersUnlocked >= 4
    },
    {
        id: 'treasure_hunter',
        name: 'Treasure Hunter',
        description: 'Earn 1000 gold!',
        emoji: '💎',
        check: (stats) => stats.goldEarned >= 1000
    },
    {
        id: 'master_builder',
        name: 'Master Builder',
        description: 'Place 100 blocks!',
        emoji: '🏗️',
        check: (stats) => stats.blocks >= 100
    }
];

export function checkNewAchievements(
    stats: GameStats,
    earnedIds: string[]
): Achievement[] {
    const newAchievements: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
        if (!earnedIds.includes(achievement.id) && achievement.check(stats)) {
            newAchievements.push(achievement);
        }
    }

    return newAchievements;
}

export function loadAchievements(): string[] {
    const saved = localStorage.getItem('kb_achievements');
    return saved ? JSON.parse(saved) : [];
}

export function saveAchievements(achievementIds: string[]): void {
    localStorage.setItem('kb_achievements', JSON.stringify(achievementIds));
}
