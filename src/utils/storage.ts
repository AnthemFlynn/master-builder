export interface SaveData {
    name: string;
    timestamp: number;
    blocks: Array<{
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number };
        materialIndex: number;
        typeIndex: number;
    }>;
    gold: number;
    score: number;
    achievements: string[];
}

export function saveBuild(slotIndex: number, data: SaveData): void {
    const key = `kb_save_slot_${slotIndex}`;
    localStorage.setItem(key, JSON.stringify(data));
}

export function loadBuild(slotIndex: number): SaveData | null {
    const key = `kb_save_slot_${slotIndex}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
}

export function getSaveSlots(): Array<SaveData | null> {
    return [1, 2, 3].map(i => loadBuild(i));
}

export function deleteSave(slotIndex: number): void {
    const key = `kb_save_slot_${slotIndex}`;
    localStorage.removeItem(key);
}
