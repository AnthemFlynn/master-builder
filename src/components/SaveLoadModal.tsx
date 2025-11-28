import { useState } from 'react';
import { SaveData, getSaveSlots, saveBuild, loadBuild, deleteSave } from '../utils/storage';

interface SaveLoadModalProps {
    mode: 'save' | 'load';
    onClose: () => void;
    onSave?: (slotIndex: number, name: string) => void;
    onLoad?: (slotIndex: number) => void;
}

export default function SaveLoadModal({ mode, onClose, onSave, onLoad }: SaveLoadModalProps) {
    const [saveName, setSaveName] = useState('My Build');
    const slots = getSaveSlots();

    const handleSave = (slotIndex: number) => {
        if (onSave) {
            onSave(slotIndex, saveName);
            onClose();
        }
    };

    const handleLoad = (slotIndex: number) => {
        if (onLoad && slots[slotIndex - 1]) {
            if (confirm('Load this build? Your current build will be replaced.')) {
                onLoad(slotIndex);
                onClose();
            }
        }
    };

    const handleDelete = (slotIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this save?')) {
            deleteSave(slotIndex);
            window.location.reload(); // Refresh to update UI
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl max-w-md w-full text-white border-2 border-purple-500">
                <h2 className="text-2xl font-bold mb-4">
                    {mode === 'save' ? '💾 Save Build' : '📂 Load Build'}
                </h2>

                {mode === 'save' && (
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Build Name:</label>
                        <input
                            type="text"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 outline-none"
                            maxLength={30}
                        />
                    </div>
                )}

                <div className="space-y-2 mb-4">
                    {[1, 2, 3].map((slotIndex) => {
                        const save = slots[slotIndex - 1];
                        return (
                            <div
                                key={slotIndex}
                                onClick={() => mode === 'save' ? handleSave(slotIndex) : handleLoad(slotIndex)}
                                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${save
                                        ? 'bg-purple-900/30 border-purple-500 hover:bg-purple-900/50'
                                        : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="font-bold">Slot {slotIndex}</div>
                                        {save ? (
                                            <>
                                                <div className="text-sm text-gray-300">{save.name}</div>
                                                <div className="text-xs text-gray-400">
                                                    {save.blocks.length} blocks • {new Date(save.timestamp).toLocaleDateString()}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-sm text-gray-500">Empty</div>
                                        )}
                                    </div>
                                    {save && (
                                        <button
                                            onClick={(e) => handleDelete(slotIndex, e)}
                                            className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
